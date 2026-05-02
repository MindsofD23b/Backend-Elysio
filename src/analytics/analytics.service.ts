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

    const [currentWeekMatches, allMatches, matchedMatches, topInterests] =
      await Promise.all([
        this.matchHistoryRepository.count({
          where: [
            { userA: { id: userId }, outcome: 'default' },
            { userB: { id: userId }, outcome: 'default' },
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
            { userA: { id: userId }, outcome: 'default' },
            { userB: { id: userId }, outcome: 'default' },
            { userA: { id: userId }, outcome: 'matched' },
            { userB: { id: userId }, outcome: 'matched' },
          ],
          select: { createdAt: true } as never,
        }),
        this.matchHistoryRepository.find({
          where: [
            { userA: { id: userId }, outcome: 'default' },
            { userB: { id: userId }, outcome: 'default' },
            { userA: { id: userId }, outcome: 'matched' },
            { userB: { id: userId }, outcome: 'matched' },
          ],
          relations: {
            userA: { userInterests: { interest: true } },
            userB: { userInterests: { interest: true } },
          },
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

    const BUCKET_STARTS = [0, 3, 6, 9, 12, 15, 18, 21];

    const bucketCounts = new Array<number>(8).fill(0);

    for (const match of matchedMatches) {
      const hour = new Date(match.createdAt).getHours();
      const bucketStart = Math.floor(hour / 3) * 3;
      const bucketIndex = BUCKET_STARTS.indexOf(bucketStart);
      if (bucketIndex !== -1) bucketCounts[bucketIndex]++;
    }

    const totalWeeks =
      matchedMatches.length > 0
        ? Math.max(1, Math.ceil(matchedMatches.length / 7))
        : 1;

    const barValues = bucketCounts.map(
      (count) => Math.round((count / totalWeeks) * 10) / 10,
    );

    const peak = Math.max(...barValues);
    const peakIndex = peak > 0 ? barValues.indexOf(peak) : null;

    const bestTimeToBeOnline = {
      barValues,
      peakIndex,
    };

    const weekCompleted = user.lastStreakWeek === currentWeek;
    const lastWeekFrozen =
      !weekCompleted &&
      user.consecutiveFreezes > 0 &&
      user.lastStreakWeek !== null;

    const interestCountMap = new Map<string, number>();
    for (const match of topInterests) {
      const opponent = match.userA.id === userId ? match.userB : match.userA;
      for (const ui of opponent.userInterests ?? []) {
        const name = ui.interest?.name;
        if (name)
          interestCountMap.set(name, (interestCountMap.get(name) ?? 0) + 1);
      }
    }
    const topMatchInterests = [...interestCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([interest, count]) => ({ interest, count }));

    return {
      avgWaitTime: user.avgWaitTime ?? null,
      avgMutualInterests,
      topMatchInterests,
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
