import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = {
  sub: string;
  email?: string;
};

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MatchmakingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MatchmakingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn('Socket connection rejected: missing token');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn('Socket connection rejected: missing userId');
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      await client.join(this.getUserRoom(userId));

      this.logger.log(`Client connected: ${userId} (socket id: ${client.id})`);

      client.emit('socket_ready', { userId });
    } catch (error) {
      this.logger.error(
        'Error occurred while handling socket connection:',
        error,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      this.logger.log(
        `Client disconnected: ${userId} (socket id: ${client.id})`,
      );
    }
  }

  @SubscribeMessage('ping_matchmaking')
  handlePing(@ConnectedSocket() client: Socket) {
    return {
      event: 'pong_matchmaking',
      data: {
        userId: client.data?.userId ?? null,
        ok: true,
      },
    };
  }

  notifyQueueWaiting(userId: string, payload: { ticketId: string }) {
    this.server.to(this.getUserRoom(userId)).emit('queue_waiting', payload);
  }

  notifyMatchFound(
    userId: string,
    payload: { matchedUserId: string; roomId: string },
  ) {
    this.server.to(this.getUserRoom(userId)).emit('match_found', payload);
  }

  notifyRoomReady(userId: string, payload: { roomId: string }) {
    this.server.to(this.getUserRoom(userId)).emit('room_ready', payload);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const authorizationHeader = client.handshake.headers.authorization;

    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice(7);
    }

    return null;
  }

  private getUserRoom(userID: string): string {
    return `user:${userID}`;
  }
}
