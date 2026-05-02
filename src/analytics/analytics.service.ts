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
        country: true,
      } as never,
    });

    if (!user) throw new NotFoundException('User not found');

    const currentWeek = this.streakService.getIsoWeek(new Date());

    const [currentWeekMatches, hourRows, dayRows, allMatches] =
      await Promise.all([
        this.matchHistoryRepository.count({
          where: [
            { userA: { id: userId }, outcome: 'matched' },
            { userB: { id: userId }, outcome: 'matched' },
          ],
        }),
        this.matchHistoryRepository
          .createQueryBuilder('m')
          .innerJoin('m.userA', 'ua')
          .innerJoin('m.userB', 'ub')
          .select(
            '(EXTRACT(HOUR FROM m."createdAt")::int / 3) * 3',
            'bucketStart',
          )
          .addSelect('COUNT(*)', 'count')
          .where('(m."userAId" = :id OR m."userBId" = :id)', { id: userId })
          .andWhere('m.outcome = :outcome', { outcome: 'matched' })
          .andWhere('ua.country = :country AND ub.country = :country', {
            country: user.country,
          })
          .groupBy('"bucketStart"')
          .getRawMany<{ bucketStart: string; count: string }>(),
        this.matchHistoryRepository
          .createQueryBuilder('m')
          .innerJoin('m.userA', 'ua')
          .innerJoin('m.userB', 'ub')
          .select('EXTRACT(DOW FROM m."createdAt")', 'dow')
          .addSelect('COUNT(*)', 'count')
          .where('(m."userAId" = :id OR m."userBId" = :id)', { id: userId })
          .andWhere('m.outcome = :outcome', { outcome: 'matched' })
          .andWhere('ua.country = :country AND ub.country = :country', {
            country: user.country,
          })
          .groupBy('dow')
          .orderBy('count', 'DESC')
          .limit(1)
          .getRawMany<{ dow: string; count: string }>(),
        this.matchHistoryRepository.find({
          where: [{ userA: { id: userId } }, { userB: { id: userId } }],
          take: 15,
          order: { createdAt: 'DESC' },
        }),
      ]);

    const scoredMatches = allMatches.filter((m) => m.mutualInterests !== null);
    const avgMutualInterests =
      scoredMatches.length > 0
        ? Math.round(
            scoredMatches.reduce(
              (sum: number, m) => sum + (m.mutualInterests ?? 0),
              0,
            ) / scoredMatches.length,
          )
        : null;

    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // Fixed 7 buckets: 03-06, 06-09, ..., 21-24 (label = end hour)
    const BUCKET_STARTS = [3, 6, 9, 12, 15, 18, 21];

    const countMap = new Map(
      hourRows.map((r) => [Number(r.bucketStart), Number(r.count)]),
    );

    const barValues = BUCKET_STARTS.map((s) => countMap.get(s) ?? 0);
    const peakIndex = barValues.indexOf(Math.max(...barValues));

    const bestTimeToBeOnline = {
      barValues,
      peakIndex: barValues[peakIndex] > 0 ? peakIndex : null,
      bestDay: dayRows[0] ? days[Number(dayRows[0].dow)] : null,
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
