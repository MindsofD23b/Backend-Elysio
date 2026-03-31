import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { UserInterest } from './entities/user-interest.entity';
import { InterestCategory } from './entities/interest-category.entity';
import { Interest } from './entities/interest.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserBlock } from './entities/user-block.entity';
import { MatchHistory } from './entities/match-history.entity';


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
    UserBlock,
    MatchHistory,
  ],

  migrations: ['src/migrations/*.ts'],

  synchronize: false,
  logging: false,
});
