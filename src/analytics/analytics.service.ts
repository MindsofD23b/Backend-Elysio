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
    let MatchTime = 0;
    let count = 0;

    const matches = await this.matchHistoryRepository.find({
      where: [{ userA: { id: userId } }, { userB: { id: userId } }],
      take: 15,
    });

    if (!matches) throw new NotFoundException('No match found');

    matches.forEach((match: MatchHistory) => {
      count++;
      MatchTime += Number(match.matchTime);
    });

    const avgTime = Math.round((MatchTime / count / 1000) * 100) / 100;

    return { avgMatchTime: avgTime };
  }
}
