import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { VerificationService } from './verification.service';
import { AuthGateway } from './auth.gateway';

import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';

import { VerificationToken } from './entities/verification-token.entity';

import { UserInterest } from 'src/interests/entities/user-interest.entity';
import { Interest } from 'src/interests/entities/interest.entity';

import { PasswordResetService } from './password-reset.service'
import { PasswordResetToken } from './entities/password-reset-token.entity'
import { User } from 'src/users/entities/user.entity'
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
    PassportModule,
    JwtModule.register({ // Made with NestJS documentation and ChatGPT
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN as any
      }
    }),
    TypeOrmModule.forFeature([VerificationToken, UserInterest, Interest, PasswordResetToken])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    VerificationService,
    AuthGateway,
    PasswordResetService,
    JwtStrategy
  ],
  exports: [AuthService, PassportModule]
})
export class AuthModule {}
