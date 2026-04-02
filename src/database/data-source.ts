import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { VerificationToken } from '../auth/entities/verification-token.entity';
import { UserInterest } from '../interests/entities/user-interest.entity';
import { InterestCategory } from '../interests/entities/interest-category.entity';
import { Interest } from '../interests/entities/interest.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { ChatRoom } from '../chats/entities/chat-room.entity';
import { ChatMessage } from '../chats/entities/chat-message.entity';
import { ChatMessageKey } from '../chats/entities/chat-message-key.entity';
import { UserBlock } from '../interests/entities/user-block.entity';
import { MatchHistory } from '../interests/entities/match-history.entity';

// Made with ChatGPT

export const AppDataSource = new DataSource({
  type: 'postgres',

  url: process.env.DATABASE_URL,

  entities: [
    User,
    Interest,
    InterestCategory,
    UserInterest,
    VerificationToken,
    PasswordResetToken,
    ChatRoom,
    ChatMessage,
    ChatMessageKey,
    UserBlock,
    MatchHistory,
  ],

  migrations: ['src/migrations/*.ts'],

  synchronize: false,
  logging: false,
});
