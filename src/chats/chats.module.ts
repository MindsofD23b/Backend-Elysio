import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageKey } from './entities/chat-message-key.entity';
import { ChatService } from './chats.service';
import { ChatController } from './chats.controller';
import { ChatCryptoService } from './crypto/chat-crypto.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../users/entities/user.entity';
import { ProfilePicture } from '../users/entities/profile-picture.entity';
import { ChatGateway } from './chat.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatRoom, ChatMessage, ChatMessageKey, User, ProfilePicture]),
    AuthModule,
    NotificationsModule,
    R2Module,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatCryptoService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
