import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { EmailService } from '../email/email.service'
import { VerificationService } from './verification.service'
import { AuthGateway } from './auth.gateway'
import { JwtService } from '@nestjs/jwt'
import { PasswordResetService } from './password-reset.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { UserInterest } from '../interests/entities/user-interest.entity'
import { Interest } from '../interests/entities/interest.entity'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'

describe('AuthService', () => {

    let service: AuthService

    const mockUsersService = {
        findByEmail: jest.fn(),
        findByPhone: jest.fn(),
        create: jest.fn(),
        save: jest.fn()
    }

    const mockEmailService = {
        sendVerificationEmail: jest.fn(),
        sendPasswordResetEmail: jest.fn()
    }

    const mockVerificationService = {
        create: jest.fn(),
        consume: jest.fn()
    }

    const mockGateway = {
        sendEmailVerified: jest.fn()
    }

    const mockJwtService = {
        sign: jest.fn().mockReturnValue('mock-token')
    }

    const mockPasswordReset = {
        createToken: jest.fn(),
        consume: jest.fn()
    }

    const mockUserInterestRepo = {
        create: jest.fn(),
        save: jest.fn()
    }

    const mockInterestRepo = {
        findByIds: jest.fn()
    }

    beforeEach(async () => {

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: mockUsersService },
                { provide: EmailService, useValue: mockEmailService },
                { provide: VerificationService, useValue: mockVerificationService },
                { provide: AuthGateway, useValue: mockGateway },
                { provide: JwtService, useValue: mockJwtService },
                { provide: PasswordResetService, useValue: mockPasswordReset },
                {
                    provide: getRepositoryToken(UserInterest),
                    useValue: mockUserInterestRepo
                },
                {
                    provide: getRepositoryToken(Interest),
                    useValue: mockInterestRepo
                }
            ]
        }).compile()

        service = module.get<AuthService>(AuthService)
    })


    // Made with the help og ChatGPT

    it('1 should be defined', () => {
        expect(service).toBeDefined()
    })


    it('2 should return email available', async () => {

        mockUsersService.findByEmail.mockRejectedValue(null)

        const result = await service.checkEmail('test@test.com')

        expect(result.available).toBe(true)
    })


    it('3 should throw if email already exists', async () => {

        mockUsersService.findByEmail.mockResolvedValue({})

        await expect(
            service.checkEmail('test@test.com')
        ).rejects.toThrow(BadRequestException)
    })


    it('4 should start registration', async () => {

        mockVerificationService.create.mockResolvedValue('token')

        const result = await service.startRegistration({
            email: 'test@test.com'
        } as any)

        expect(result.message).toBe('Verification email sent')
    })


    it('5 should send verification email', async () => {

        mockVerificationService.create.mockResolvedValue('token')

        await service.startRegistration({ email: 'test@test.com' } as any)

        expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled()
    })


    it('6 should throw if verification token invalid', async () => {

        mockVerificationService.consume.mockResolvedValue(null)

        await expect(
            service.verifyEmail('token')
        ).rejects.toThrow(BadRequestException)
    })


    it('7 should create user after email verification', async () => {

        mockVerificationService.consume.mockResolvedValue({
            email: 'test@test.com'
        })

        mockUsersService.create.mockResolvedValue({ id: '1', email: 'test@test.com' })

        const result = await service.verifyEmail('token')

        expect(result.success).toBe(true)
    })


    it('8 should notify gateway after verification', async () => {

        mockVerificationService.consume.mockResolvedValue({
            email: 'test@test.com'
        })

        mockUsersService.create.mockResolvedValue({ id: '1', email: 'test@test.com' })

        await service.verifyEmail('token')

        expect(mockGateway.sendEmailVerified).toHaveBeenCalled()
    })


    it('9 should assign interests to user', async () => {

        mockVerificationService.consume.mockResolvedValue({
            email: 'test@test.com',
            interests: [1, 2]
        })

        mockUsersService.create.mockResolvedValue({ id: '1' })

        mockInterestRepo.findByIds.mockResolvedValue([{ id: 1 }, { id: 2 }])

        await service.verifyEmail('token')

        expect(mockUserInterestRepo.save).toHaveBeenCalled()
    })


    it('10 forgotPassword should return message if user missing', async () => {

        mockUsersService.findByEmail.mockResolvedValue(null)

        const result = await service.forgotPassword({
            email: 'x@test.com'
        })

        expect(result.message).toContain('reset link')
    })


    it('11 forgotPassword should create reset token', async () => {

        mockUsersService.findByEmail.mockResolvedValue({ email: 'test@test.com' })

        await service.forgotPassword({
            email: 'test@test.com'
        })

        expect(mockPasswordReset.createToken).toHaveBeenCalled()
    })


    it('12 forgotPassword should send reset email', async () => {

        mockUsersService.findByEmail.mockResolvedValue({ email: 'test@test.com' })

        await service.forgotPassword({
            email: 'test@test.com'
        })

        expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled()
    })


    it('13 resetPassword should update password', async () => {

        mockPasswordReset.consume.mockResolvedValue('test@test.com')

        mockUsersService.findByEmail.mockResolvedValue({
            password: 'old'
        })

        await service.resetPassword({
            token: 'token',
            password: 'new'
        })

        expect(mockUsersService.save).toHaveBeenCalled()
    })


    it('14 login should throw if no credentials', async () => {

        await expect(
            service.login({ password: '123' } as any)
        ).rejects.toThrow(BadRequestException)
    })


    it('15 login should find user by email', async () => {

        mockUsersService.findByEmail.mockResolvedValue({
            id: '1',
            password: 'hash'
        })

        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true)

        const result = await service.login({
            email: 'test@test.com',
            password: '123'
        })

        expect(result.token).toBe('mock-token')
    })


    it('16 login should find user by phone', async () => {

        mockUsersService.findByPhone.mockResolvedValue({
            id: '1',
            password: 'hash'
        })

        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true)

        const result = await service.login({
            phonePrefix: '+41',
            phoneNumber: '123',
            password: '123'
        })

        expect(result.token).toBe('mock-token')
    })


    it('17 login should throw if user not found', async () => {

        mockUsersService.findByEmail.mockResolvedValue(null)

        await expect(
            service.login({ email: 'x', password: '123' })
        ).rejects.toThrow(UnauthorizedException)
    })


    it('18 login should throw if password invalid', async () => {

        mockUsersService.findByEmail.mockResolvedValue({
            password: 'hash'
        })

        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false)

        await expect(
            service.login({ email: 'x', password: '123' })
        ).rejects.toThrow(UnauthorizedException)
    })


    it('19 should generate jwt token', async () => {

        mockUsersService.findByEmail.mockResolvedValue({
            id: '1',
            password: 'hash'
        })

        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true)

        const result = await service.login({
            email: 'test@test.com',
            password: '123'
        })

        expect(result.token).toBe('mock-token')
    })


    it('20 jwtService.sign should be called', async () => {

        mockUsersService.findByEmail.mockResolvedValue({
            id: '1',
            password: 'hash'
        })

        jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true)

        await service.login({
            email: 'test@test.com',
            password: '123'
        })

        expect(mockJwtService.sign).toHaveBeenCalled()
    })

})