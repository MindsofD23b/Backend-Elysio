import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { VerificationService } from './verification.service';
import { AuthGateway } from './auth.gateway';

import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';

import { VerificationToken } from '../database/entities/verification-token.entity';

import { UserInterest } from 'src/database/entities/user-interest.entity';
import { Interest } from 'src/database/entities/interest.entity';

import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { User } from 'src/database/entities/user.entity';
import { constants } from 'src/config/constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserInterest,
      Interest,
      User,
      VerificationToken,
      PasswordResetToken,
    ]),
    UsersModule,
    JwtModule.register({
      // Made with NestJS documentation and ChatGPT
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: constants.JWT_EXPIRES_IN,
      },
    }),
    TypeOrmModule.forFeature([
      VerificationToken,
      UserInterest,
      Interest,
      PasswordResetToken,
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    VerificationService,
    AuthGateway,
    PasswordResetService,
  ],
})
export class AuthModule {}
