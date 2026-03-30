import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { User } from '../database/entities/user.entity';
import { MatchmakingState } from './enums/matchmaking-state.enum';
import { QueueTicket } from './interfaces/queue-ticket.interface';


@Injectable()
export class MatchmakingService {
  private readonly stateStore = new Map<string, MatchmakingState>();
  private readonly activeTickets = new Map<string, QueueTicket>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  async activateCall(userId: string): Promise<QueueTicket> {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: { userInterests: { interest: true } } });

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
      throw new BadRequestException('User is already in the matchmaking queue');
    }

    if (
      currentState === MatchmakingState.RESERVED ||
      currentState === MatchmakingState.CONNECTING ||
      currentState === MatchmakingState.IN_ROOM
    ) {
      throw new BadRequestException(`User cannot activate call while in state "${currentState}"`);
    }
    const draftTicket = this.buildQueueTicketFromUser(user);
    const poolKey = this.buildPoolKey(draftTicket);

    const ticket: QueueTicket = {
      ...draftTicket,
      poolKey,
      state: MatchmakingState.WAITING,
      updatedAt: new Date().toISOString(),
    };
    this.setCurrentState(user.id, MatchmakingState.WAITING);
    this.activeTickets.set(user.id, ticket);

    return ticket;
  }

  async deactivateCall(userId: string): Promise<{ success: true }> {
    const user = await this.userRepository.findOne({ where: { id: userId }, select: { id: true } as any });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.activeTickets.delete(user.id);
    this.setCurrentState(user.id, MatchmakingState.IDLE);

    return { success: true };
  }

  buildQueueTicketFromUser(user: User): QueueTicket {
    const now = new Date().toISOString();
    const age = this.calculateAge(user.dateOfBirth ?? null);
    const interests = this.extractInterestNames(user);

    const ticket: QueueTicket = {
      ticketId: randomUUID(),
      userId: user.id,
      state: MatchmakingState.IDLE,
      poolKey: '',
      gender: this.normalizeValue((user as any).gender),
      targetGender: this.getTargetGender(user),
      age,
      language: this.normalizeValue((user as any).language),
      country: this.normalizeValue((user as any).country),
      interests,
      createdAt: now,
      updatedAt: now,
    };

    return ticket;
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

  setCurrentState(userId: string, state: MatchmakingState): void {
    this.activeTickets.get(userId) ?? null;
  }

  getActiveTicket(userId: string): QueueTicket | null {
    return this.activeTickets.get(userId) ?? null;
  }

  private assertUserCanEnterQueue(user: User): void {
    if (!(user as any).id) {
      throw new BadRequestException('User id is missing');
    }

    if ((user as any).emailVerified === false) {
      throw new BadRequestException('User email is not verified');
    }

    if ((user as any).acceptedTerms === false) {
      throw new BadRequestException('User has not accepted terms and conditions');
    }

    if ((user as any).acceptedPrivacyPolicy === false) {
      throw new BadRequestException('User has not accepted privacy policy');
    }

    if ((user as any).gender) {
      throw new BadRequestException('User gender is missing');
    }

    if ((user as any).language) {
      throw new BadRequestException('User language is missing');
    }

    if ((user as any).country) {
      throw new BadRequestException('User country is missing');
    }
  }

  private calculateAge(dateOfBirth: Date | string | null): number | null {
    if (!dateOfBirth) {
      return null;
    }

    const dob = new Date(dateOfBirth);

    if (Number.isNaN(dob.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();

    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age >= 0 ? age : null;
  }

  private extractInterestNames(user: User): string[] {
    const rawUserInterests = (user as any).userInterests;

    if (!Array.isArray(rawUserInterests)) {
      return [];
    }

    return rawUserInterests
      .map((userInterest: any) => {
        if (typeof userInterest?.interest?.name === 'string') {
          return userInterest.interest.name.trim().toLowerCase();
        }
        return null;
      })
      .filter((value: string | null): value is string => Boolean(value));
  }

  private getTargetGender(user: User): string | null {
    const candidateFields = [
      (user as any).targetGender,
      (user as any).preferredGender,
      (user as any).interestedIn,
    ];

    for (const value of candidateFields) {
      const normalized = this.normalizeValue(value);

      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim().toLowerCase();

    return trimmed.length > 0 ? trimmed : null;
  }
}
