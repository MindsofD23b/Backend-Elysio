import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(MatchHistory)
    private readonly matchHistoryRepository: Repository<MatchHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUsersAnalytics(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, avgWaitTime: true } as never,
    });

    if (!user) throw new NotFoundException('User not found');

    const matches = await this.matchHistoryRepository.find({
      where: [{ userA: { id: userId } }, { userB: { id: userId } }],
      take: 15,
    });

    return {
      avgWaitTime: user.avgWaitTime ?? null,
      matches,
    };
  }
}
