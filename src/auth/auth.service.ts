import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(dto.password, 12)

        const user = await this.usersService.create({
            ...dto,
            password: hashedPassword,
        })

        return this.generateToken(user.id)
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email)

        const isMatch = await bcrypt.compare(dto.password, user.password)

        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials')
        }

        return this.generateToken(user.id)
    }

    private generateToken(userId: string) {
        const payload = { sub: userId }
        return {
            access_token: this.jwtService.sign(payload),
        }
    }
}