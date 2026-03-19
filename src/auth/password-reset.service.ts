import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private repo: Repository<PasswordResetToken>,
  ) {}

  async createToken(email: string) {
    const token = randomUUID();

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15);

    const reset = this.repo.create({
      email,
      token,
      expiresAt: expires,
    });

    await this.repo.save(reset);

    return token;
  }

  async consume(token: string) {
    const record = await this.repo.findOne({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException('Invalid token');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    await this.repo.delete({ id: record.id });

    return record.email;
  }
}
