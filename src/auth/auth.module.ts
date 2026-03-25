import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { VerificationService } from './verification.service';
import { AuthGateway } from './auth.gateway';

import { UsersModule } from '../users/users.module';


import { VerificationToken } from '../database/entities/verification-token.entity';
import { UserInterest } from 'src/database/entities/user-interest.entity';
import { Interest } from 'src/database/entities/interest.entity';

import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from '../database/entities/password-reset-token.entity';
import { User } from 'src/database/entities/user.entity';

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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        const expiresIn =
          (configService.get<string>('JWT_EXPIRES_IN') ?? '7d') as StringValue;

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
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
export class AuthModule { }
