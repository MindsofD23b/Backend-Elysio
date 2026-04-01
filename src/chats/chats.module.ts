import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageKey } from './entities/chat-message-key.entity';
import { ChatService } from './chats.service';
import { ChatController } from './chats.controller';
import { ChatCryptoService } from './crypto/chat-crypto.service';
import { AuthModule } from '../auth/auth.module';
import { User } from 'src/users/entities/user.entity';


@Module({
    imports: [
        TypeOrmModule.forFeature([ChatRoom, ChatMessage, ChatMessageKey, User]),
      AuthModule
    ],
    controllers: [ChatController],
    providers: [ChatService, ChatCryptoService],
    exports: [ChatService],
})
export class ChatModule {}  