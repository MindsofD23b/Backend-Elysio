import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/response-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';
import * as bcrypt from 'bcrypt';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(MatchHistory)
    private matchHistoryRepository: Repository<MatchHistory>,
  ) { }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      ...dto,
      password: hashedPassword,
    });

    const saved = await this.userRepository.save(user);

    return this.mapToResponseDto(saved);
  }

  async save(user: User) {
    return this.userRepository.save(user);
  }

  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email ?? null,
      phoneNumber: user.phoneNumber ?? null,
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
    };
  }
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByPhone(prefix: string, number: string) {
    return this.userRepository.findOne({
      where: {
        phonePrefix: prefix,
        phoneNumber: number,
      },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updatePublicKey(userId: string, publicKey: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { publicKey });
  }

  async getPublicKey(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'publicKey'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user.publicKey;
  }

  async callsLeft(userId: string): Promise<{ callsToday: number }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.matchHistoryRepository
      .createQueryBuilder('mh')
      .where('(mh.userAId = :userId OR mh.userBId = :userId)', { userId })
      .andWhere('mh.outcome = :state', { state: 'matched' })
      .andWhere('mh.createdAt BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      })
      .getCount();

    return { callsToday: count };
  }

  async findByAppleId(appleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { appleId } });
  }

  async createAppleUser(data: {
    appleId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  }): Promise<User> {
    const user = this.userRepository.create({
      appleId: data.appleId,
      email: data.email,
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      emailVerified: true,
      password: null,
      phonePrefix: null,
      phoneNumber: null,
      gender: '',
      country: '',
      language: '',
      jobTitle: '',
      aboutMe: '',
      acceptedTerms: false,
      acceptedPrivacyPolicy: false,
    });

    return this.userRepository.save(user);
  }
}
