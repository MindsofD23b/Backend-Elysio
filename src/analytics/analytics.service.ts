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

    const [currentWeekMatches, allMatches, matchedMatches] = await Promise.all([
      this.matchHistoryRepository.count({
        where: [
          { userA: { id: userId }, outcome: 'matched' },
          { userB: { id: userId }, outcome: 'matched' },
        ],
      }),
      this.matchHistoryRepository.find({
        where: [{ userA: { id: userId } }, { userB: { id: userId } }],
        take: 15,
        order: { createdAt: 'DESC' },
      }),
      this.matchHistoryRepository.find({
        where: [
          { userA: { id: userId }, outcome: 'matched' },
          { userB: { id: userId }, outcome: 'matched' },
        ],
        select: { createdAt: true } as never,
      }),
    ]);

    const scoredMatches = allMatches.filter((m) => m.mutualInterests !== null);
    const avgMutualInterests =
      scoredMatches.length > 0
        ? Math.round(
            scoredMatches.reduce(
              (sum: number, m) => sum + (m.mutualInterests as number),
              0,
            ) / scoredMatches.length,
          )
        : null;

    const DAYS = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const BUCKET_STARTS = [3, 6, 9, 12, 15, 18, 21];

    const bucketCounts = new Array<number>(7).fill(0);
    const dayCounts = new Array<number>(7).fill(0);

    for (const match of matchedMatches) {
      const date = new Date(match.createdAt);
      const hour = date.getHours();
      const bucketStart = Math.floor(hour / 3) * 3;
      const bucketIndex = BUCKET_STARTS.indexOf(bucketStart);
      if (bucketIndex !== -1) bucketCounts[bucketIndex]++;
      dayCounts[date.getDay()]++;
    }

    const peakIndex = bucketCounts.indexOf(Math.max(...bucketCounts));
    const peakDayIndex = dayCounts.indexOf(Math.max(...dayCounts));

    const bestTimeToBeOnline = {
      barValues: bucketCounts,
      peakIndex: bucketCounts[peakIndex] > 0 ? peakIndex : null,
      bestDay: matchedMatches.length > 0 ? DAYS[peakDayIndex] : null,
    };

    const weekCompleted = user.lastStreakWeek === currentWeek;
    const lastWeekFrozen =
      !weekCompleted &&
      user.consecutiveFreezes > 0 &&
      user.lastStreakWeek !== null;

    return {
      avgWaitTime: user.avgWaitTime ?? null,
      avgMutualInterests,
      bestTimeToBeOnline,
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
    };
  }
}
