import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { EmailService } from './email.service'
import { VerificationService } from './verification.service'
import { AuthGateway } from './auth.gateway'

import { UsersModule } from '../users/users.module'
import { JwtModule } from '@nestjs/jwt'

import { VerificationToken } from '../database/entities/verification-token.entity'

@Module({
  imports: [
    UsersModule,
    JwtModule.register({ // Made with NestJS documentation and ChatGPT
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN as any
      }
    }),
    TypeOrmModule.forFeature([VerificationToken])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    EmailService,
    VerificationService,
    AuthGateway
  ]
})
export class AuthModule { }