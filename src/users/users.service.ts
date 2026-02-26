import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UserResponseDto } from './dto/response-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt'


@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(dto: CreateUserDto): Promise<UserResponseDto> {
        const hashedPassword = await bcrypt.hash(dto.password, 12)


        const user = this.usersRepository.create({
            ...dto, 
            password: hashedPassword
        })
        const saved = await this.usersRepository.save(user)

        return this.mapToResponseDto(saved)
    }

    private mapToResponseDto(user: User): UserResponseDto {
        return {
            id: user.id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            emailVerified: user.emailVerified,
            gender: user.gender,
            firstName: user.firstName,
            lastName: user.lastName,
            dateOfBirth: user.dateOfBirth,
            country: user.country,
            language: user.language,
            jobTitle: user.jobTitle,
            aboutMe: user.aboutMe, 
            createdAt: user.createdAt,
        }
    }
    async findAll(): Promise<User[]> {
        return this.usersRepository.find();
    }

    async findByEmail(email: string): Promise<User> {
        const user = await this.usersRepository.findOne({
            where: { email },
        })

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }
}
