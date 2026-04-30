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
import { User } from '../users/entities/user.entity';
import { AppleLoginDto } from './dto/apple-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import * as appleSignin from 'apple-signin-auth';

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
    const { interests, ...userData } = dto as {
      interests: number[];
    } & CompleteRegisterDto;

    const user = await this.usersService.create({ ...userData });

    const token = await this.verificationService.create(dto.email, {
      userId: user.id,
      interests: interests ?? [],
    });

    await this.emailService.sendVerificationEmail(dto.email, token);

    return {
      message: 'Verification email sent',
      userId: user.id,
      token: this.generateToken(user.id).token,
    };
  }

  async verifyEmail(token: string) {
    const payload = await this.verificationService.consume(token);

    if (!payload) {
      throw new BadRequestException('Invalid token');
    }

    const { userId, interests } = payload as {
      userId: string;
      interests: number[];
    };

    const user = await this.usersService.findById(userId);

    user.emailVerified = true;
    await this.usersService.save(user);

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

    if (user.email) {
      this.gateway.sendEmailVerified(user.email);
    }

    return { success: true, userId: user.id };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService
      .findByEmail(dto.email)
      .catch(() => null);

    if (user) {
      const token = await this.passwordResetService.createToken(dto.email);
      await this.emailService.sendPasswordResetEmail(dto.email, token);
    }

    return { message: 'If the email exists, a reset link was sent' };
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

    if (!user.password) {
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

  async appleLogin(dto: AppleLoginDto) {
    let payload: any;

    try {
      payload = await appleSignin.verifyIdToken(dto.identityToken, {
        audience: process.env.APPLE_BUNDLE_ID,
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException('Invalid Apple token');
    }

    const appleUserId: string = payload.sub;
    // JWT email takes precedence; credential email is the fallback for first sign-in
    const email: string | null = payload.email ?? dto.email ?? null;
    const emailVerified: boolean =
      payload.email_verified === true || payload.email_verified === 'true';

    // Combine all name parts Apple provides (only populated on first sign-in)
    const firstName =
      [dto.namePrefix, dto.givenName, dto.middleName]
        .filter(Boolean)
        .join(' ') || null;
    const lastName =
      [dto.familyName, dto.nameSuffix].filter(Boolean).join(' ') || null;

    let user = await this.usersService.findByAppleId(appleUserId);

    if (!user) {
      user = await this.usersService.createAppleUser({
        appleId: appleUserId,
        email,
        emailVerified,
        firstName,
        lastName,
        nickname: dto.nickname || null,
        realUserStatus: dto.realUserStatus ?? null,
      });
    }

    return this.generateToken(user.id);
  }

  async googleLogin(dto: GoogleLoginDto) {
    let googleUser: any;

    try {
      const res = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${dto.idToken}`,
      );
      if (!res.ok) throw new Error('Token rejected by Google');
      googleUser = await res.json();
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    // Validate audience matches one of our registered client IDs
    const validAudiences = [
      process.env.GOOGLE_IOS_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_WEB_CLIENT_ID,
    ].filter(Boolean);

    if (validAudiences.length > 0 && !validAudiences.includes(googleUser.aud)) {
      throw new UnauthorizedException('Invalid Google token audience');
    }

    const googleId: string = googleUser.sub;
    const email: string | null = googleUser.email ?? null;
    const firstName: string | null = googleUser.given_name ?? null;
    const lastName: string | null = googleUser.family_name ?? null;
    // locale is e.g. "en", "de", "de-CH" — take just the base language tag
    const language: string | null = googleUser.locale
      ? (googleUser.locale as string).split('-')[0]
      : null;
    const emailVerified: boolean =
      googleUser.email_verified === 'true' ||
      googleUser.email_verified === true;

    let user = await this.usersService.findByGoogleId(googleId);

    if (!user && email) {
      // Link Google to an existing email-based account if found
      const existing = await this.usersService.findByEmail(email).catch(() => null);
      if (existing) {
        existing.googleId = googleId;
        if (!existing.emailVerified && emailVerified) {
          existing.emailVerified = true;
        }
        await this.usersService.save(existing);
        user = existing;
      }
    }

    if (!user) {
      user = await this.usersService.createGoogleUser({
        googleId,
        email,
        firstName,
        lastName,
        language,
        emailVerified,
      });
    }

    return this.generateToken(user.id);
  }
}
