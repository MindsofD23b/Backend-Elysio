import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MediaService } from './media.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class VideoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly mediaService: MediaService) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const { peerId, roomId } = client.handshake.query as {
      peerId?: string;
      roomId?: string;
    };

    client.data.peerId = peerId;
    client.data.roomId = roomId;

    if (roomId) {
      client.join(roomId);
      console.log(`[gateway] peer ${peerId} joined socket room ${roomId}`);
    }
  }

  handleDisconnect(client: Socket) {
    const { peerId, roomId } = client.data as {
      peerId?: string;
      roomId?: string;
    };

    if (peerId && roomId) {
      this.mediaService.leaveRoom(roomId, peerId);
      console.log(`[gateway] peer ${peerId} left socket room ${roomId}`);
    }
  }

  notifyNewProducer(roomId: string, producerId: string, peerId: string) {
    this.server.to(roomId).emit('new-producer', { producerId, peerId });
  }
}
