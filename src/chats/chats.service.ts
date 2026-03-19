import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageKey } from './entities/chat-message-key.entity';
import { CreateChatRoomDTO } from './dto/create-chat-room.dto';
import { SendTextMessageDTO } from './dto/send-text-message.dto';
import { ChatMessageType } from './enums/chat-message-type.enum';
import { createDecipheriv } from 'crypto';


@Injectable()
export class ChatsService {
    constructor(
        @InjectRepository(ChatRoom)
        private readonly roomRepo: Repository<ChatRoom>,

        @InjectRepository(ChatMessage)
        private readonly messageRepo: Repository<ChatMessage>,

        @InjectRepository(ChatMessageKey)
        private readonly messageKeyRepo: Repository<ChatMessageKey>,
    ) { }

    async createRoom(currentUserId: string, dto: CreateChatRoomDTO) {
        if (currentUserId === dto.otherUserId) {
            throw new BadRequestException('Cannot create a chat room with yourself');
        }

        const [userAId, userBId] = [currentUserId, dto.otherUserId].sort();

        let room = await this.roomRepo.findOne({
            where: { userAId, userBId },
        })

        if (room) return room;

        room = this.roomRepo.create({
            userAId,
            userBId,
        })
        return await this.roomRepo.save(room);
    }

    async sendTextMessage(
        currentUserId: string,
        roomId: string,
        dto: SendTextMessageDTO,
    ) {
        const room = await this.roomRepo.findOne({
            where: { id: roomId },
        })

        if (!room) {
            throw new NotFoundException('Chat room not found');
        }

        const isParticipant = room.userAId === currentUserId || room.userBId === currentUserId;

        if (!isParticipant) {
            throw new ForbiddenException('You are not a participant of this chat room');
        }

        if (dto.type !== ChatMessageType.TEXT) {
            throw new BadRequestException('Invalid message type');
        }

        const message = this.messageRepo.create({
            roomId: room.id,
            senderId: currentUserId,
            type: ChatMessageType.TEXT,
            ciphertext: dto.ciphertext,
            iv: dto.iv,
            authTag: dto.authTag,
        })
        const savedMessage = await this.messageRepo.save(message);

        const keys = dto.encryptedKeys.map((item) =>
            this.messageKeyRepo.create({
                messageId: savedMessage.id,
                userId: item.userId,
                encryptedKey: item.encryptedKey,
            }),
        )
        await this.messageKeyRepo.save(keys)

        return savedMessage;
    }

    async getMessages(currentUserId: string, roomId: string) {
        const room = await this.roomRepo.findOne({ where: { id: roomId } })

        if (!room) {
            throw new NotFoundException('Chat room not found');
        }

        const messages = await this.messageRepo.find({
            where: { roomId },
            order: { createdAt: 'ASC' },
        })

        const messageIds = messages.map((m) => m.id);

        const keys = messageIds.length ? await this.messageKeyRepo.find({
            where: {
                userId: currentUserId,
            }
        }) : [];

        const keyMap = new Map(
            keys.map((k) => [`${k.messageId}:${k.userId}`, k.encryptedKey]),
        )

        return messages.map((message) => ({
            id: message.id,
            roomId: message.roomId,
            senderId: message.senderId,
            type: message.type,
            ciphertext: message.ciphertext,
            iv: message.iv,
            authTag: message.authTag,
            encryptedKey: keyMap.get(`${message.id}:${currentUserId}`) ?? null,
            createdAt: message.createdAt,
        }))
    }
}
