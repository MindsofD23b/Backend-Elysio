import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MediaService } from './media.service';

@WebSocketGateway({ cors: { origin: false } })
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VideoGateway.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
  ) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn('Video socket rejected: missing token');
      client.disconnect();
      return;
    }

    try {
      this.jwtService.verify(token);
    } catch {
      this.logger.warn('Video socket rejected: invalid token');
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
      this.logger.log(`peer ${peerId} left socket room ${roomId}`);
    }
  }

  notifyNewProducer(roomId: string, producerId: string, peerId: string) {
    this.server.to(roomId).emit('new-producer', { producerId, peerId });
  }
}
