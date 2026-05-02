import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MediaService } from './media.service';
import { ChatService } from '../chats/chats.service';

type JwtPayload = { sub: string };

@WebSocketGateway({ cors: { origin: false } })
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VideoGateway.name);

  // roomId → userId of the peer who liked first
  private readonly roomLikedBy = new Map<string, string>();

  constructor(
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn('Video socket rejected: missing token');
      client.emit('auth_error', { reason: 'video_missing_token' });
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data.userId = payload.sub;
    } catch (err) {
      this.logger.warn('Video socket rejected: invalid token');
      client.emit('auth_error', {
        reason: 'video_invalid_token',
        detail: err instanceof Error ? err.message : String(err),
      });
      client.disconnect();
      return;
    }

    const { peerId, roomId } = client.handshake.query as {
      peerId?: string;
      roomId?: string;
    };

    client.data.peerId = peerId;
    client.data.roomId = roomId;

    if (roomId) {
      client.join(roomId);
      this.logger.log(`peer ${peerId} joined socket room ${roomId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const { peerId, roomId } = client.data as {
      peerId?: string;
      roomId?: string;
    };

    if (peerId && roomId) {
      this.mediaService.leaveRoom(roomId, peerId);
      this.roomLikedBy.delete(roomId);
      client.to(roomId).emit('peer_left', { peerId });
      this.logger.log(`peer ${peerId} left socket room ${roomId}`);
    }
  }

  notifyNewProducer(roomId: string, producerId: string, peerId: string) {
    this.server.to(roomId).emit('new-producer', { producerId, peerId });
  }

  @SubscribeMessage('send_reaction')
  handleSendReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { emoji: string },
  ) {
    const { roomId, peerId } = client.data as {
      roomId?: string;
      peerId?: string;
    };
    if (!roomId || !peerId || !data?.emoji) return;
    this.server
      .to(roomId)
      .except(client.id)
      .emit('receive_reaction', { emoji: data.emoji, fromPeerId: peerId });
    this.logger.log(
      `peer ${peerId} reacted with ${data.emoji} in room ${roomId}`,
    );
  }

  @SubscribeMessage('send_like')
  handleSendLike(@ConnectedSocket() client: Socket) {
    const { roomId, peerId, userId } = client.data as {
      roomId?: string;
      peerId?: string;
      userId?: string;
    };

    if (!roomId || !peerId || !userId) return;

    this.roomLikedBy.set(roomId, userId);
    this.server
      .to(roomId)
      .except(client.id)
      .emit('receive_like', { fromPeerId: peerId });
    this.logger.log(`peer ${peerId} sent a like in room ${roomId}`);
  }

  @SubscribeMessage('send_like_back')
  async handleSendLikeBack(@ConnectedSocket() client: Socket) {
    const { roomId, peerId, userId } = client.data as {
      roomId?: string;
      peerId?: string;
      userId?: string;
    };

    console.log(`[LikeBack] peer ${peerId} liked back in room ${roomId}`);
    this.logger.log(`peer ${peerId} liked back in room ${roomId}`);

    if (!roomId || !userId) return;

    const originalLikerUserId = this.roomLikedBy.get(roomId);
    if (!originalLikerUserId || originalLikerUserId === userId) return;

    try {
      const chatRoom = await this.chatService.findOrCreateRoom(userId, {
        otherUserId: originalLikerUserId,
      });

      this.server.to(roomId).emit('mutual_like', { chatRoomId: chatRoom.id });
      this.roomLikedBy.delete(roomId);
      this.logger.log(
        `Mutual like in room ${roomId} → chat room ${chatRoom.id}`,
      );
    } catch (err) {
      this.logger.error('Failed to create chat room on mutual like', err);
    }
  }
}
