import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { User } from '../database/entities/user.entity';
import { MatchmakingState } from './enums/matchmaking-state.enum';
import { QueueTicket } from './interfaces/queue-ticket.interface';

@Injectable()
export class MatchmakingService {
  private readonly stateStore = new Map<string, MatchmakingState>();
  private readonly activeTickets = new Map<string, QueueTicket>();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) { }

  async activateCall(userId: string): Promise<QueueTicket> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: {
        userInterests: {
          interest: true,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertUserCanEnterQueue(user);

    const currentState = this.getCurrentState(user.id);

    if (currentState === MatchmakingState.WAITING) {
      const existingTicket = this.activeTickets.get(user.id);

      if (existingTicket) {
        return existingTicket;
      }

      throw new BadRequestException('User is already waiting');
    }

    if (
      currentState === MatchmakingState.RESERVED ||
      currentState === MatchmakingState.CONNECTING ||
      currentState === MatchmakingState.IN_ROOM
    ) {
      throw new BadRequestException(
        `User cannot activate call while in state "${currentState}"`,
      );
    }

    const baseTicket = this.buildQueueTicketFromUser(user);

    const ticket: QueueTicket = {
      ...baseTicket,
      state: MatchmakingState.WAITING,
      poolKey: this.buildPoolKey(baseTicket),
      updatedAt: new Date().toISOString(),
    };

    this.stateStore.set(user.id, MatchmakingState.WAITING);
    this.activeTickets.set(user.id, ticket);

    return ticket;
  }

  async deactivateCall(userId: string): Promise<{ success: true }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
      } as never,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.activeTickets.delete(user.id);
    this.stateStore.set(user.id, MatchmakingState.IDLE);

    return { success: true };
  }

  async getMyQueueStatus(userId: string): Promise<{
    state: MatchmakingState;
    ticket: QueueTicket | null;
  }> {
    return {
      state: this.getCurrentState(userId),
      ticket: this.activeTickets.get(userId) ?? null,
    };
  }

  buildQueueTicketFromUser(user: User): QueueTicket {
    const now = new Date().toISOString();

    return {
      ticketId: randomUUID(),
      userId: user.id,
      state: MatchmakingState.IDLE,
      poolKey: '',
      gender: this.normalizeString(user.gender),
      targetGender: this.getTargetGender(user),
      age: this.calculateAge(user.dateOfBirth ?? null),
      language: this.normalizeString(user.language),
      country: this.normalizeString(user.country),
      interests: this.extractInterests(user),
      createdAt: now,
      updatedAt: now,
    };
  }

  buildPoolKey(ticket: QueueTicket): string {
    const targetGender = ticket.targetGender ?? 'any';
    const country = ticket.country ?? 'global';
    const language = ticket.language ?? 'any';

    return `match:${targetGender}:${country}:${language}`;
  }

  getCurrentState(userId: string): MatchmakingState {
    return this.stateStore.get(userId) ?? MatchmakingState.IDLE;
  }

  private assertUserCanEnterQueue(user: User): void {
    if (!user.id) {
      throw new BadRequestException('User id is missing');
    }

    if (!user.emailVerified) {
      throw new BadRequestException('User email is not verified');
    }

    if (!user.acceptedTerms) {
      throw new BadRequestException('User has not accepted terms');
    }

    if (!user.acceptedPrivacyPolicy) {
      throw new BadRequestException('User has not accepted privacy policy');
    }

    if (!user.gender) {
      throw new BadRequestException('User gender is missing');
    }

    if (!user.language) {
      throw new BadRequestException('User language is missing');
    }

    if (!user.country) {
      throw new BadRequestException('User country is missing');
    }

    if (!user.dateOfBirth) {
      throw new BadRequestException('User date of birth is missing');
    }

    if (!user.interestedIn) {
      throw new BadRequestException('User interestedIn is missing');
    }
  }

  private calculateAge(dateOfBirth: Date | null): number | null {
    if (!dateOfBirth) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();

    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    const dayDiff = today.getDate() - dateOfBirth.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  private extractInterests(user: User): string[] {
    if (!user.userInterests?.length) {
      return [];
    }

    return user.userInterests
      .map((userInterest) => userInterest.interest?.name?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value));
  }

  private getTargetGender(user: User): string | null {
    return this.normalizeString(user.interestedIn);
  }

  private normalizeString(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase();

    return normalized.length > 0 ? normalized : null;
  }
}