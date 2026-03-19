// src/chat/chat.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatsController } from './chats.controller'
import { ChatsService } from './chats.service'
import { ChatRoom } from './entities/chat-room.entity'
import { ChatMessage } from './entities/chat-message.entity'
import { ChatMessageKey } from './entities/chat-message-key.entity'
import { ChatCryptoService } from './crypto/chat-crypto.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      ChatMessage,
      ChatMessageKey,
    ]),
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatCryptoService],
  exports: [ChatsService],
})
export class ChatModule { }