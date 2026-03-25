import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class VideoGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const { peerId, roomId } = client.handshake.query as {
      peerId: string;
      roomId: string;
    };
    if (roomId) {
      client.join(roomId);
      console.log(`[gateway] peer ${peerId} joined socket room ${roomId}`);
    }
  }

  notifyNewProducer(roomId: string, producerId: string, peerId: string) {
    this.server.to(roomId).emit('new-producer', { producerId, peerId });
  }
}
