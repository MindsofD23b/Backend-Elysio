import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { UserInterest } from './entities/user-interest.entity';
import { InterestCategory } from './entities/interest-category.entity';
import { Interest } from './entities/interest.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

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
  ],

  migrations: ['src/migrations/*.ts'],

  synchronize: false,
  logging: false,
});
