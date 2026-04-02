import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { VerificationService } from './verification.service';
import { AuthGateway } from './auth.gateway';
import { CompleteRegisterDto } from './dto/complete-register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UserInterest } from '../interests/entities/user-interest.entity';
import { Interest } from '../interests/entities/interest.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordResetService } from './password-reset.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private emailService: EmailService,
    private verificationService: VerificationService,
    private gateway: AuthGateway,
    private jwtService: JwtService,
    private passwordResetService: PasswordResetService,

    @InjectRepository(UserInterest)
    private userInterestRepo: Repository<UserInterest>,

    @InjectRepository(Interest)
    private interestRepo: Repository<Interest>,
  ) {}

  async checkEmail(email: string) {
    const exists = await this.usersService
      .findByEmail(email)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      throw new BadRequestException('Email already in use');
    }

    return { available: true };
  }

  async startRegistration(dto: CompleteRegisterDto) {
    const token = await this.verificationService.create(dto.email, dto);

    await this.emailService.sendVerificationEmail(dto.email, token);

    return {
      message: 'Verification email sent',
    };
  }

  async verifyEmail(token: string) {
    const payload = await this.verificationService.consume(token);

    if (!payload) {
      throw new BadRequestException('Invalid token');
    }

    const { interests, ...userData } = payload as {
      interests: Interest[];
    } & CompleteRegisterDto;

    const user = await this.usersService.create({
      ...userData,
    });

    if (interests && interests.length > 0) {
      const interestEntities = await this.interestRepo.findByIds(interests);

      const userInterests = interestEntities.map((i) =>
        this.userInterestRepo.create({
          user,
          interest: i,
        }),
      );

      await this.userInterestRepo.save(userInterests);
    }

    this.gateway.sendEmailVerified(user.email);

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      return { message: 'If the email exists a reset link was sent' };
    }

    const token = await this.passwordResetService.createToken(dto.email);

    await this.emailService.sendPasswordResetEmail(dto.email, token);

    return {
      message: 'Reset email sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = await this.passwordResetService.consume(dto.token);

    const user = await this.usersService.findByEmail(email);

    const hashed = await bcrypt.hash(dto.password, 12);

    user.password = hashed;

    await this.usersService.save(user);

    return { success: true };
  }

  async login(dto: LoginDto) {
    let user: User | null;

    if (dto.email) {
      user = await this.usersService.findByEmail(dto.email);
    } else if (dto.phonePrefix && dto.phoneNumber) {
      user = await this.usersService.findByPhone(
        dto.phonePrefix,
        dto.phoneNumber,
      );
    } else {
      throw new BadRequestException(
        'Provide either email or phonePrefix + phoneNumber',
      );
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user.id);
  }
  private generateToken(userId: string) {
    const payload = { sub: userId };

    return {
      token: this.jwtService.sign(payload),
    };
  }

  async validateJwtUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
