import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { VerificationService } from './verification.service';
import { AuthGateway } from './auth.gateway';

import { UsersModule } from '../users/users.module';

import { VerificationToken } from './entities/verification-token.entity';

import { UserInterest } from 'src/interests/entities/user-interest.entity';
import { Interest } from 'src/interests/entities/interest.entity';

import { PasswordResetService } from './password-reset.service'
import { PasswordResetToken } from './entities/password-reset-token.entity'
import { User } from 'src/users/entities/user.entity'
import { JwtStrategy } from './jwt.strategy';



@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([
      UserInterest,
      Interest,
      User,
      VerificationToken,
      PasswordResetToken,
    ]),
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        const expiresIn = (configService.get<string>('JWT_EXPIRES_IN') ??
          '7d') as StringValue;

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
    JwtStrategy,
  ],
  exports: [AuthService, PassportModule, JwtModule],
})
export class AuthModule {}
