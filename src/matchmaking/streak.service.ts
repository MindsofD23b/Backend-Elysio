import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

const MAX_FREEZES = 2;

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async updateStreak(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        lastStreakWeek: true,
        consecutiveFreezes: true,
      } as never,
    });

    if (!user) return;

    const currentWeek = this.getIsoWeek(new Date());
    const lastWeek = user.lastStreakWeek;

    if (lastWeek === currentWeek) {
      // Already matched this week — no change needed
      return;
    }

    let { currentStreak, consecutiveFreezes } = user;

    if (!lastWeek) {
      // First ever match
      currentStreak = 1;
      consecutiveFreezes = 0;
    } else {
      const weeksDiff = this.weeksDifference(lastWeek, currentWeek);

      if (weeksDiff === 1) {
        // Perfect consecutive week
        currentStreak += 1;
        consecutiveFreezes = 0;
      } else {
        // Missed weeks — each missed week consumes one freeze
        const missedWeeks = weeksDiff - 1;
        const freezesNeeded = missedWeeks;

        if (consecutiveFreezes + freezesNeeded <= MAX_FREEZES) {
          // Freezes cover the gap — streak survives
          currentStreak += 1;
          consecutiveFreezes += freezesNeeded;
        } else {
          // Too many missed weeks — streak resets
          currentStreak = 1;
          consecutiveFreezes = 0;
        }
      }
    }

    const longestStreak = Math.max(currentStreak, user.longestStreak);

    await this.usersRepository.update(userId, {
      currentStreak,
      longestStreak,
      lastStreakWeek: currentWeek,
      consecutiveFreezes,
    });
  }

  getIsoWeek(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const weekNumber =
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7,
      );
    return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  }

  private weeksDifference(weekA: string, weekB: string): number {
    const toDate = (w: string): Date => {
      const [year, week] = w.split('-W').map(Number);
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = (jan4.getDay() + 6) % 7;
      const monday = new Date(jan4);
      monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7);
      return monday;
    };

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return Math.round(
      (toDate(weekB).getTime() - toDate(weekA).getTime()) / msPerWeek,
    );
  }
}
