import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/response-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';
import * as bcrypt from 'bcrypt';
import { R2Service } from 'src/r2/r2.service';
import { ProfilePicture } from './entities/profile-picture.entity';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(MatchHistory)
    private matchHistoryRepository: Repository<MatchHistory>,

    @InjectRepository(ProfilePicture)
    private readonly picRepo: Repository<ProfilePicture>,
    private readonly r2: R2Service,
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

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profilePictures'],
    });
    if (!user) throw new NotFoundException('User not found');

    const pic =
      user.profilePictures?.find((p) => p.isPrimary) ??
      user.profilePictures?.[0] ??
      null;
    const photoUrl = pic ? await this.r2.getSignedUrl(pic.r2Key) : null;

    return { ...this.mapToResponseDto(user), photoUrl };
  }

  async findByAppleId(appleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { appleId } });
  }

  async createAppleUser(data: {
    appleId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    nickname?: string | null;
    realUserStatus?: number | null;
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

  async uploadProfilePicture(userId: string, file: Express.Multer.File) {
    console.log(`[uploadProfilePicture] Called for userId: ${userId}`);
    console.log(`[uploadProfilePicture] File:`, {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      hasBuffer: !!file?.buffer,
    });

    if (!file?.buffer) {
      console.error(`[uploadProfilePicture] No file or buffer — aborting`);
      throw new Error("No file received");
    }

    try {
      const key = await this.r2.uploadProfilePicture(userId, file);
      console.log(`[uploadProfilePicture] R2 upload succeeded, key: ${key}`);

      const pic = this.picRepo.create({ r2Key: key, user: { id: userId } });
      await this.picRepo.save(pic);
      console.log(`[uploadProfilePicture] Saved to DB, pic.id: ${pic.id}`);

      return { id: pic.id, key };
    } catch (err) {
      console.error(`[uploadProfilePicture] Failed:`, err);
      throw err;
    }
  }

  async getSignedPhotoUrl(userId: string, photoId: string) {
    const pic = await this.picRepo.findOne({
      where: { id: photoId, user: { id: userId } },
    });
    if (!pic) throw new NotFoundException('Photo not found');

    const url = await this.r2.getSignedUrl(pic.r2Key);
    return { url };
  }

  async deleteProfilePicture(userId: string, photoId: string) {
    const pic = await this.picRepo.findOne({
      where: { id: photoId, user: { id: userId } },
    });
    if (!pic) throw new NotFoundException('Photo not found');

    await this.r2.deleteFile(pic.r2Key);
    await this.picRepo.remove(pic);

    return { deleted: true };
  }
}
