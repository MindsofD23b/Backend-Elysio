import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { EmailService } from '../email/email.service'
import { VerificationService } from './verification.service'
import { AuthGateway } from './auth.gateway'
import { JwtService } from '@nestjs/jwt'
import { PasswordResetService } from './password-reset.service'
import { UserInterest } from '../database/entities/user-interest.entity'
import { Interest } from '../database/entities/interest.entity'


describe('AuthService', () => {
    let service: AuthService
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: {} },
                { provide: EmailService, useValue: {} },
                { provide: VerificationService, useValue: {} },
                { provide: AuthGateway, useValue: {} },
                { provide: JwtService, useValue: {} },
                { provide: PasswordResetService, useValue: {} },
                {
                    provide: getRepositoryToken(UserInterest),
                    useValue: {}
                },
                {
                    provide: getRepositoryToken(Interest),
                    useValue: {}
                }
            ]
        }).compile()

        service = module.get<AuthService>(AuthService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })
})