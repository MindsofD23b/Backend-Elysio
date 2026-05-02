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

  async checkStreak(
    userId: string,
  ): Promise<{ updated: boolean; currentStreak: number }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true, currentStreak: true, lastMatchDate: true } as never,
    });

    if (!user) return { updated: false, currentStreak: 0 };

    const today = this.getDateString(new Date());
    const updated = user.lastMatchDate === today;
    return { updated, currentStreak: user.currentStreak };
  }

  async updateStreak(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        lastStreakWeek: true,
        consecutiveFreezes: true,
        lastFreezeReset: true,
      } as never,
    });

    if (!user) return;

    const now = new Date();
    const currentMonth = this.getMonthString(now);
    const currentWeek = this.getIsoWeek(now);
    const lastWeek = user.lastStreakWeek;

    if (lastWeek === currentWeek) {
      return;
    }

    let { currentStreak } = user;
    let consecutiveFreezes =
      user.lastFreezeReset !== currentMonth ? 0 : user.consecutiveFreezes;
    const freezeWasReset = user.lastFreezeReset !== currentMonth;

    if (!lastWeek) {
      currentStreak = 1;
      consecutiveFreezes = 0;
    } else {
      const weeksDiff = this.weeksDifference(lastWeek, currentWeek);

      if (weeksDiff === 1) {
        currentStreak += 1;
        consecutiveFreezes = 0;
      } else {
        const missedWeeks = weeksDiff - 1;
        const freezesNeeded = missedWeeks;

        if (consecutiveFreezes + freezesNeeded <= MAX_FREEZES) {
          currentStreak += 1;
          consecutiveFreezes += freezesNeeded;
        } else {
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
      lastMatchDate: this.getDateString(now),
      ...(freezeWasReset && { lastFreezeReset: currentMonth }),
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

  getDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  getMonthString(date: Date): string {
    return date.toISOString().slice(0, 7); // "YYYY-MM"
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
