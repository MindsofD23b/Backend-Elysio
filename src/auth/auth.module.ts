import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailService } from '../email/email.service'
import { VerificationService } from './verification.service'
import { AuthGateway } from './auth.gateway'

import { UsersModule } from '../users/users.module'
import { JwtModule } from '@nestjs/jwt'

import { VerificationToken } from '../database/entities/verification-token.entity'

import { UserInterest } from 'src/database/entities/user-interest.entity'
import { Interest } from 'src/database/entities/interest.entity'

import { PasswordResetService } from './password-reset.service'
import { PasswordResetToken } from '../database/entities/password-reset-token.entity'
import { ConfigService } from '@nestjs/config'
import { User } from 'src/database/entities/user.entity'
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
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' }
      }),
    })],
      
  controllers: [AuthController],
    providers: [
      AuthService,
      EmailService,
      VerificationService,
      AuthGateway,
      PasswordResetService
    ]
})
export class AuthModule { }