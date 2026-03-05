import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import { EmailService } from './email.service'
import { VerificationService } from './verification.service'
import { AuthGateway } from './auth.gateway'
import { CompleteRegisterDto } from './dto/complete-register.dto'
import * as bcrypt from 'bcrypt'
import { LoginDto } from './dto/login.dto'


@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private emailService: EmailService,
        private verificationService: VerificationService,
        private gateway: AuthGateway,
        private jwtService: JwtService,
    ) { }

    async checkEmail(email: string) {
        const exists = await this.usersService.findByEmail(email).then(() => true).catch(() => false)

        if (exists) {
            throw new BadRequestException('Email already in use')
        }

        return { available: true }
    }

    async startRegistration(dto: CompleteRegisterDto) {

        const token = await this.verificationService.create(dto.email, dto)

        await this.emailService.sendVerificationEmail(dto.email, token)

        return {
            message: 'Verification email sent'
        }
    }

    async verifyEmail(token: string) {
        const payload = await this.verificationService.consume(token)
        if (!payload) {
            throw new BadRequestException('Invalid or expired token')
        }

        const user = await this.usersService.create({
            ...payload,
            emailVerified: true
        })

        this.gateway.sendEmailVerified(user.email)

        return { success: true }
    }

    async login(dto: LoginDto) {

        let user

        if (dto.email) {
            user = await this.usersService.findByEmail(dto.email)
        }
        else if (dto.phonePrefix && dto.phoneNumber) {
            user = await this.usersService.findByPhone(
                dto.phonePrefix,
                dto.phoneNumber
            )
        }
        else {
            throw new BadRequestException(
                'Provide either email or phonePrefix + phoneNumber'
            )
        }

        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const isMatch = await bcrypt.compare(dto.password, user.password)

        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials')
        }

        return this.generateToken(user.id)
    }
    private generateToken(userId: string) {
        const payload = { sub: userId }

        return {
            token: this.jwtService.sign(payload),
        }
    }

}