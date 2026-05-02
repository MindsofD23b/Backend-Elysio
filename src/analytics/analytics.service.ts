import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';
import { User } from '../users/entities/user.entity';
import { StreakService } from '../matchmaking/streak.service';

const MAX_FREEZES = 2;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(MatchHistory)
    private readonly matchHistoryRepository: Repository<MatchHistory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly streakService: StreakService,
  ) {}

  async getUsersAnalytics(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        avgWaitTime: true,
        currentStreak: true,
        longestStreak: true,
        lastStreakWeek: true,
        consecutiveFreezes: true,
      } as never,
    });

    if (!user) throw new NotFoundException('User not found');

    const currentWeek = this.streakService.getIsoWeek(new Date());

    const [matches, currentWeekMatches] = await Promise.all([
      this.matchHistoryRepository.find({
        where: [{ userA: { id: userId } }, { userB: { id: userId } }],
        take: 15,
        order: { createdAt: 'DESC' },
      }),
      this.matchHistoryRepository.count({
        where: [
          { userA: { id: userId }, outcome: 'matched' },
          { userB: { id: userId }, outcome: 'matched' },
        ],
      }),
    ]);

    const scoredMatches = matches.filter((m) => m.mutualInterests !== null);
    const avgMutualInterests =
      scoredMatches.length > 0
        ? Math.round(
            scoredMatches.reduce(
              (sum: number, m) => sum + (m.mutualInterests ?? 0),
              0,
            ) / scoredMatches.length,
          )
        : null;

    const weekCompleted = user.lastStreakWeek === currentWeek;
    const lastWeekFrozen =
      !weekCompleted &&
      user.consecutiveFreezes > 0 &&
      user.lastStreakWeek !== null;

    return {
      avgWaitTime: user.avgWaitTime ?? null,
      avgMutualInterests,
      streak: {
        current: user.currentStreak,
        longest: user.longestStreak,
        freezesUsed: user.consecutiveFreezes,
        freezesRemaining: MAX_FREEZES - user.consecutiveFreezes,
        currentWeek: {
          completed: weekCompleted,
          frozen: lastWeekFrozen,
          matches: currentWeekMatches,
        },
      },
      matches,
    };
  }
}
