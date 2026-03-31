import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { User } from '../database/entities/user.entity';
import { UserBlock } from '../database/entities/user-block.entity';
import { MatchHistory } from '../database/entities/match-history.entity';

import { MatchmakingState } from './enums/matchmaking-state.enum';
import { QueueTicket } from './interfaces/queue-ticket.interface';
import { ActivateCallResponse } from './interfaces/activate-call-response.interface';

import { MatchmakingGateway } from './matchmaking.gateway';

@Injectable()
export class MatchmakingService {
  private readonly stateStore = new Map<string, MatchmakingState>();
  private readonly activeTickets = new Map<string, QueueTicket>();

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepository: Repository<UserBlock>,
    @InjectRepository(MatchHistory)
    private readonly matchHistoryRepository: Repository<MatchHistory>,
    private readonly matchmakingGateway: MatchmakingGateway,
  ) { }

  async activateCall(userId: string): Promise<ActivateCallResponse> {
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
        return {
          type: 'waiting',
          ticket: existingTicket,
        };
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

    const match = await this.findMatchForUser(ticket);

    if (!match) {
      this.matchmakingGateway.notifyQueueWaiting(user.id, { ticketId: ticket.ticketId });

      return {
        type: 'waiting',
        ticket,
      };
    }

    return this.createMatch(ticket, match);
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
      targetGender: this.normalizeString(user.interestedIn),
      age: this.calculateAge(user.dateOfBirth),
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

  private async findMatchForUser(
    currentTicket: QueueTicket,
  ): Promise<QueueTicket | null> {
    const candidates = Array.from(this.activeTickets.values());

    for (const candidate of candidates) {
      if (candidate.userId === currentTicket.userId) {
        continue;
      }

      if (this.getCurrentState(candidate.userId) !== MatchmakingState.WAITING) {
        continue;
      }

      if (!this.isGenderCompatible(currentTicket, candidate)) {
        continue;
      }

      const ageCompatible = await this.isAgeCompatible(
        currentTicket.userId,
        candidate.userId,
        currentTicket.age,
        candidate.age,
      );

      if (!ageCompatible) {
        continue;
      }

      const blocked = await this.isBlocked(currentTicket.userId, candidate.userId);

      if (blocked) {
        continue;
      }

      return candidate;
    }

    return null;
  }

  private async createMatch(
    ticket: QueueTicket,
    match: QueueTicket,
  ): Promise<ActivateCallResponse> {
    const roomId = this.createRoomId();

    this.stateStore.set(ticket.userId, MatchmakingState.CONNECTING);
    this.stateStore.set(match.userId, MatchmakingState.CONNECTING);

    this.activeTickets.delete(ticket.userId);
    this.activeTickets.delete(match.userId);

    const userA = await this.usersRepository.findOne({
      where: { id: ticket.userId },
    });

    const userB = await this.usersRepository.findOne({
      where: { id: match.userId },
    });

    if (!userA || !userB) {
      throw new NotFoundException('Matched user not found');
    }

    await this.matchHistoryRepository.save(
      this.matchHistoryRepository.create({
        userA,
        userB,
        roomId,
        outcome: 'matched',
      }),
    );

    this.matchmakingGateway.notifyMatchFound(ticket.userId, {
      matchedUserId: match.userId,
      roomId,
    });

    this.matchmakingGateway.notifyMatchFound(match.userId, {
      matchedUserId: ticket.userId,
      roomId,
    });

    this.matchmakingGateway.notifyRoomReady(ticket.userId, {
      roomId,
    });

    this.matchmakingGateway.notifyRoomReady(match.userId, {
      roomId,
    });

    return {
      type: 'matched',  
      ticket,
      matchedUserId: match.userId,
      roomId,
    };
  }

  private isGenderCompatible(
    currentTicket: QueueTicket,
    candidate: QueueTicket,
  ): boolean {
    if (!currentTicket.gender || !candidate.gender) {
      return false;
    }

    if (!this.matchesPreference(currentTicket.targetGender, candidate.gender)) {
      return false;
    }

    if (!this.matchesPreference(candidate.targetGender, currentTicket.gender)) {
      return false;
    }

    return true;
  }

  private matchesPreference(
    preference: string | null,
    otherGender: string | null,
  ): boolean {
    if (!otherGender) {
      return false;
    }

    if (!preference || preference === 'any' || preference === 'both') {
      return true;
    }

    return preference === otherGender;
  }

  private async isAgeCompatible(
    currentUserId: string,
    candidateUserId: string,
    currentAge: number | null,
    candidateAge: number | null,
  ): Promise<boolean> {
    if (currentAge === null || candidateAge === null) {
      return false;
    }

    const [currentUser, candidateUser] = await Promise.all([
      this.usersRepository.findOne({
        where: { id: currentUserId },
        select: {
          id: true,
          minPreferredAge: true,
          maxPreferredAge: true,
        } as never,
      }),
      this.usersRepository.findOne({
        where: { id: candidateUserId },
        select: {
          id: true,
          minPreferredAge: true,
          maxPreferredAge: true,
        } as never,
      }),
    ]);

    if (!currentUser || !candidateUser) {
      return false;
    }

    if (
      currentUser.minPreferredAge !== null &&
      candidateAge < currentUser.minPreferredAge
    ) {
      return false;
    }

    if (
      currentUser.maxPreferredAge !== null &&
      candidateAge > currentUser.maxPreferredAge
    ) {
      return false;
    }

    if (
      candidateUser.minPreferredAge !== null &&
      currentAge < candidateUser.minPreferredAge
    ) {
      return false;
    }

    if (
      candidateUser.maxPreferredAge !== null &&
      currentAge > candidateUser.maxPreferredAge
    ) {
      return false;
    }

    return true;
  }

  private async isBlocked(userIdA: string, userIdB: string): Promise<boolean> {
    const block = await this.userBlockRepository.findOne({
      where: [
        {
          blocker: { id: userIdA },
          blocked: { id: userIdB },
        },
        {
          blocker: { id: userIdB },
          blocked: { id: userIdA },
        },
      ],
      relations: {
        blocker: true,
        blocked: true,
      },
    });

    return Boolean(block);
  }

  private createRoomId(): string {
    return randomUUID();
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

    if (user.isBlockedFromMatching) {
      throw new BadRequestException('User is blocked from matchmaking');
    }

    const age = this.calculateAge(user.dateOfBirth);

    if (age === null || age < 18) {
      throw new BadRequestException('User must be at least 18 years old');
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

  private normalizeString(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toLowerCase();

    return normalized.length > 0 ? normalized : null;
  }
}