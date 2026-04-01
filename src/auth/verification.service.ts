import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationToken } from './entities/verification-token.entity';
import { randomUUID } from 'crypto';

// Made with ChatGPT and TypeORM documentation: https://typeorm.io/repository-api#repositorycreateentity-like---entity

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationToken)
    private repo: Repository<VerificationToken>,
  ) {}

  async create(email: string, payload: object) {
    const token = randomUUID();

    const record = this.repo.create({
      email,
      token,
      payload,
    });

    await this.repo.save(record);
    return token;
  }

  async consume(token: string) {
    const record: VerificationToken | null = await this.repo.findOne({
      where: { token },
    });

    if (!record) return null;

    await this.repo.delete(record.id);

    return record.payload;
  }
}
