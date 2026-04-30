import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: { origin: false },
})
export class AuthGateway {
  @WebSocketServer()
  server: Server;

  sendEmailVerified(email: string) {
    this.server.emit('emailVerified', { email });
  }
}
