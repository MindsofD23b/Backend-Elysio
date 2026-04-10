import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
    namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    client.join(`room:${payload.roomId}`);
    return { event: 'joined', roomId: payload.roomId };
  }

    broadcastNewMessage(
        roomId: string,
        message: {
            id: string;
            roomId: string;
            senderId: string;
            type: string;
            createdAt: string;
            encryptedKeys: { userId: string; encryptedKey: string }[];
            ciphertext: string;
            iv: string;
            authTag: string;
        },
    ) {
        this.server.to(`room:${roomId}`).emit("new_message", message);
    }

    @UseGuards(WsJwtGuard)
    @SubscribeMessage('leave_room')
    handleLeaveRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { roomId: string },
    ) {
        client.leave(`room:${payload.roomId}`);
    }
}
