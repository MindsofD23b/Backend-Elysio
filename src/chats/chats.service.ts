import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageKey } from './entities/chat-message-key.entity';
import { User } from '../users/entities/user.entity';
import { SendTextMessageDTO } from './dto/send-text-message.dto';
import { CreateChatRoomDTO } from './dto/create-chat-room.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ChatGateway } from './chat.gateway';

export interface GetMessagesQuery {
    before?: string;
    limit?: number;
}

const PLACEHOLDER_AVATAR = 'https://i.pravatar.cc/150';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatRoom)
        private readonly roomRepo: Repository<ChatRoom>,

        @InjectRepository(ChatMessage)
        private readonly messageRepo: Repository<ChatMessage>,

        @InjectRepository(ChatMessageKey)
        private readonly keyRepo: Repository<ChatMessageKey>,

        @InjectDataSource()
        private readonly dataSource: DataSource,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        private readonly notificationsService: NotificationsService,
        private readonly chatGateway: ChatGateway,
    ) { }

    async findOrCreateRoom(
        currentUserId: string,
        dto: CreateChatRoomDTO,
    ): Promise<ChatRoom> {
        if (!dto.otherUserId) {
            throw new NotFoundException('otherUserId fehlt');
        }

        if (dto.otherUserId === currentUserId) {
            throw new ForbiddenException(
                'Du kannst keinen Chat mit dir selbst erstellen',
            );
        }

        const [userAId, userBId] = [currentUserId, dto.otherUserId].sort();

        const existing = await this.roomRepo.findOne({
            where: { userAId, userBId },
        });

        if (existing) return existing;

        const otherUser = await this.userRepo.findOne({
            where: { id: dto.otherUserId },
        });

        if (!otherUser) {
            throw new NotFoundException('Gegenüberliegender User nicht gefunden');
        }

        const room = this.roomRepo.create({
            userAId,
            userBId,
        });

        return this.roomRepo.save(room);
    }
    async getRoomsWithLastMessage(currentUserId: string) {
        const rooms = await this.roomRepo
            .createQueryBuilder('room')
            .where('room.userAId = :uid OR room.userBId = :uid', {
                uid: currentUserId,
            })
            .orderBy('room.updatedAt', 'DESC')
            .getMany();

        if (rooms.length === 0) return [];

        const roomIds = rooms.map((r) => r.id);

        const lastMessages = await this.messageRepo
            .createQueryBuilder('msg')
            .distinctOn(['msg.roomId'])
            .where('msg.roomId IN (:...roomIds)', { roomIds })
            .andWhere('msg.isDeleted = false')
            .orderBy('msg.roomId')
            .addOrderBy('msg.createdAt', 'DESC')
            .getMany();

        const lastMsgByRoom = new Map(lastMessages.map((m) => [m.roomId, m]));

        const lastMsgIds = lastMessages.map((m) => m.id);
        const keys = lastMsgIds.length > 0
            ? await this.keyRepo
                .createQueryBuilder('k')
                .where('k.messageId IN (:...messageIds)', { messageIds: lastMsgIds })
                .andWhere('k.userId = :uid', { uid: currentUserId })
                .getMany()
            : [];

        const keyByMessage = new Map(keys.map((k) => [k.messageId, k.encryptedKey]));

        const otherUserIds = rooms.map((r) =>
            r.userAId === currentUserId ? r.userBId : r.userAId,
        );
        const uniqueOtherIDs = [...new Set(otherUserIds)];

        const otherUsers = await this.userRepo
            .createQueryBuilder('u')
            .select(['u.id', 'u.firstName', 'u.lastName'])
            .where('u.id IN (:...ids)', { ids: uniqueOtherIDs })
            .getMany();

        const userById = new Map(otherUsers.map((u) => [u.id, u]));

        return rooms.map((room) => {
            const otherUserId = room.userAId === currentUserId ? room.userBId : room.userAId;
            const otherUser = userById.get(otherUserId);
            const lastMessage = lastMsgByRoom.get(room.id) ?? null;

            return {
                room,
                lastMessage: lastMessage
                    ? {
                        ...lastMessage,
                        // NEU: encryptedKeys Array wie im Frontend erwartet
                        encryptedKeys: keyByMessage.has(lastMessage.id)
                            ? [{ userId: currentUserId, encryptedKey: keyByMessage.get(lastMessage.id)! }]
                            : [],
                    }
                    : null,
                otherUser: otherUser
                    ? {
                        id: otherUser.id,
                        fullName: `${otherUser.firstName} ${otherUser.lastName}`,
                        avatar: `${PLACEHOLDER_AVATAR}?u=${otherUser.id}`,
                    }
                    : null,
            };
        });
    }

    async getMessages(
        currentUserId: string,
        roomId: string,
        query: GetMessagesQuery,
    ) {
        const { before, limit = 30 } = query;
        const safeLimit = Math.min(limit, 100);

        await this.assertRoomMember(currentUserId, roomId);

        const qb = this.messageRepo
            .createQueryBuilder('msg')
            .where('msg.roomId = :roomId', { roomId })
            .andWhere('msg.isDeleted = false')
            .orderBy('msg.createdAt', 'DESC')
            .take(safeLimit + 1);

        if (before) {
            qb.andWhere('msg.createdAt < :before', { before: new Date(before) });
        }

        const messages = await qb.getMany();

        const hasMore = messages.length > safeLimit;
        if (hasMore) messages.pop();

        const messageIds = messages.map((m) => m.id);
        const keys =
            messageIds.length > 0
                ? await this.keyRepo
                    .createQueryBuilder('k')
                    .where('k.messageId IN (:...messageIds)', { messageIds })
                    .andWhere('k.userId = :uid', { uid: currentUserId })
                    .getMany()
                : [];

        const keyByMessage = new Map(
            keys.map((k) => [k.messageId, k.encryptedKey]),
        );

        return {
            messages: messages.map((msg) => ({
                ...msg,
                encryptedKey: keyByMessage.get(msg.id) ?? null,
            })),
            hasMore,
            nextCursor: hasMore
                ? messages[messages.length - 1].createdAt.toISOString()
                : null,
        };
    }

    async sendMessage(
        currentUserId: string,
        roomId: string,
        dto: SendTextMessageDTO,
    ): Promise<ChatMessage> {
        await this.assertRoomMember(currentUserId, roomId);

        const savedMessage = await this.dataSource.transaction(async (manager) => {
            const message = manager.create(ChatMessage, {
                roomId,
                senderId: currentUserId,
                type: dto.type,
                ciphertext: dto.ciphertext,
                iv: dto.iv,
                authTag: dto.authTag,
            });
            const saved = await manager.save(ChatMessage, message);

            const keys = dto.encryptedKeys.map((k) =>
                manager.create(ChatMessageKey, {
                    messageId: saved.id,
                    userId: k.userId,
                    encryptedKey: k.encryptedKey,
                }),
            );
            await manager.save(ChatMessageKey, keys);

            await manager.update(
                ChatRoom,
                { id: roomId },
                {
                    updatedAt: new Date(),
                },
            );

            const room = await this.roomRepo.findOne({ where: { id: roomId } });

            if (room) {
                const recipientId =
                    room.userAId === currentUserId ? room.userBId : room.userAId;
                const sender = await this.userRepo.findOne({
                    where: { id: currentUserId },
                    select: ['firstName', 'lastName'],
                });
                const senderName = sender
                    ? `${sender.firstName} ${sender.lastName}`
                    : 'Someone';
                await this.notificationsService.sendPushNotification(
                    recipientId,
                    `${senderName} has sent you a message`,
                    '',
                );
            }

            return saved;
        });

        this.chatGateway.broadcastNewMessage(roomId, {
            id: savedMessage.id,
            roomId: savedMessage.roomId,
            senderId: savedMessage.senderId,
            type: savedMessage.type,
            createdAt: savedMessage.createdAt.toISOString(),
            encryptedKeys: dto.encryptedKeys,
            ciphertext: savedMessage.ciphertext!,
            iv: savedMessage.iv!,
            authTag: savedMessage.authTag!,
        });

        return savedMessage;
    }
    private async assertRoomMember(userId: string, roomId: string) {
        const room = await this.roomRepo.findOne({ where: { id: roomId } });
        if (!room) throw new NotFoundException('Chat-Room nicht gefunden');
        if (room.userAId !== userId && room.userBId !== userId) {
            throw new ForbiddenException('Kein Zugriff auf diesen Chat');
        }
        return room;
    }


    async getRoomPublicKeys(currentUserId: string, roomId: string) {
        const room = await this.assertRoomMember(currentUserId, roomId);

        const userIds = [room.userAId, room.userBId];

        const users = await this.userRepo
            .createQueryBuilder('u')
            .select(['u.id', 'u.publicKey'])
            .where('u.id IN (:...userIds)', { userIds })
            .getMany();

        return users.map((u) => ({
            userId: u.id,
            publicKey: u.publicKey,
        }));
    }
}
