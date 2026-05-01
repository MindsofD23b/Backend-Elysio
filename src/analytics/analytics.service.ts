import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(MatchHistory)
    private readonly matchHistoryRepository: Repository<MatchHistory>,
  ) {}

  async getUsersAnalytics(userId: string) {
    const matches = await this.matchHistoryRepository.find({
      where: [{ userA: { id: userId } }, { userB: { id: userId } }],
    });

    if (!matches) throw new NotFoundException('No match found');

    return matches;
  }
}
