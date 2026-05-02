import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { User } from '../users/entities/user.entity';
import { UserBlock } from '../interests/entities/user-block.entity';
import { MatchHistory } from './entities/match-history.entity';

import { MatchmakingState } from './enums/matchmaking-state.enum';
import { QueueTicket } from './interfaces/queue-ticket.interface';
import { ActivateCallResponse } from './interfaces/activate-call-response.interface';

import { MatchmakingGateway } from './matchmaking.gateway';
import { StreakService } from './streak.service';

const PREVIOUS_CALL_WAIT_THRESHOLD_MS = 30_000; // 30 seconds

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
    private readonly streakService: StreakService,
  ) {}

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

    if (currentState === MatchmakingState.RESERVED) {
      throw new BadRequestException(
        `User cannot activate call while in state "${currentState}"`,
      );
    }

    if (
      currentState === MatchmakingState.CONNECTING ||
      currentState === MatchmakingState.IN_ROOM
    ) {
      const existingMatch = await this.matchHistoryRepository.findOne({
        where: [
          { userA: { id: user.id }, outcome: 'default' },
          { userB: { id: user.id }, outcome: 'default' },
          { userA: { id: user.id }, outcome: 'matched' },
          { userB: { id: user.id }, outcome: 'matched' },
        ],
        relations: { userA: true, userB: true },
        order: { createdAt: 'DESC' },
      });

      if (existingMatch?.roomId) {
        this.matchmakingGateway.notifyRoomReady(user.id, {
          roomId: existingMatch.roomId,
        });
        const matchedUserId =
          existingMatch.userA.id === user.id
            ? existingMatch.userB.id
            : existingMatch.userA.id;
        return {
          type: 'matched',
          ticket: this.activeTickets.get(user.id) ?? ({} as QueueTicket),
          matchedUserId,
          roomId: existingMatch.roomId,
        };
      }

      // Truly stale (no DB record, e.g. server restarted) — only then reset
      this.activeTickets.delete(user.id);
      this.stateStore.set(user.id, MatchmakingState.IDLE);
    }

    const baseTicket = this.buildQueueTicketFromUser(user);

    const ticket: QueueTicket = {
      ...baseTicket,
      state: MatchmakingState.WAITING,
      poolKey: this.buildPoolKey(baseTicket),
      updatedAt: new Date().toISOString(),
    };

    this.activeTickets.set(user.id, ticket);
    this.stateStore.set(user.id, MatchmakingState.WAITING);

    const match = await this.findMatchForUser(ticket);

    if (!match) {
      this.matchmakingGateway.notifyQueueWaiting(user.id, {
        ticketId: ticket.ticketId,
      });

      return {
        type: 'waiting',
        ticket,
      };
    }

    return this.createMatch(ticket, match);
  }

  async setRoomOutcome(
    roomId: string,
    outcome: 'matched' | 'declined',
  ): Promise<void> {
    await this.matchHistoryRepository.update({ roomId }, { outcome });
  }

  leaveRoom(userId: string): { success: true } {
    this.stateStore.set(userId, MatchmakingState.IDLE);
    this.activeTickets.delete(userId);
    return { success: true };
  }

  async declineMatch(
    userId: string,
    roomId: string,
  ): Promise<{ success: true }> {
    await this.matchHistoryRepository.update(
      { roomId, outcome: 'default' },
      { outcome: 'declined' },
    );
    this.stateStore.set(userId, MatchmakingState.IDLE);
    this.activeTickets.delete(userId);
    return { success: true };
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

  getMyQueueStatus(userId: string): {
    state: MatchmakingState;
    ticket: QueueTicket | null;
  } {
    return {
      state: this.getCurrentState(userId),
      ticket: this.activeTickets.get(userId) ?? null,
    };
  }

  async getMyRoomId(userId: string): Promise<{ roomId: string | null }> {
    const match = await this.matchHistoryRepository.findOne({
      where: [{ userA: { id: userId } }, { userB: { id: userId } }],
      relations: { userA: true, userB: true },
      order: { createdAt: 'DESC' },
    });

    return { roomId: match?.roomId ?? null };
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
    const waitMs = Date.now() - new Date(currentTicket.createdAt).getTime();
    const allowPreviousCalls = waitMs >= PREVIOUS_CALL_WAIT_THRESHOLD_MS;

    const candidates = Array.from(this.activeTickets.values()).filter(
      (c) =>
        c.userId !== currentTicket.userId &&
        this.getCurrentState(c.userId) === MatchmakingState.WAITING &&
        this.isGenderCompatible(currentTicket, c),
    );

    // First pass: fresh candidates only (no prior calls together)
    const fresh = await this.filterCandidates(currentTicket, candidates, false);
    if (fresh) return fresh;

    // Second pass: after threshold, allow previously-called users with shared interests
    if (allowPreviousCalls) {
      return this.filterCandidates(currentTicket, candidates, true);
    }

    return null;
  }

  private async filterCandidates(
    currentTicket: QueueTicket,
    candidates: QueueTicket[],
    allowPreviousCalls: boolean,
  ): Promise<QueueTicket | null> {
    for (const candidate of candidates) {
      this.stateStore.set(currentTicket.userId, MatchmakingState.CONNECTING);
      this.stateStore.set(candidate.userId, MatchmakingState.CONNECTING);

      const [ageCompatible, blocked, declined, previousCall] =
        await Promise.all([
          this.isAgeCompatible(
            currentTicket.userId,
            candidate.userId,
            currentTicket.age,
            candidate.age,
          ),
          this.isBlocked(currentTicket.userId, candidate.userId),
          this.hasDeclinedMatch(currentTicket.userId, candidate.userId),
          this.hasPreviousCall(currentTicket.userId, candidate.userId),
        ]);

      const rollback = () => {
        this.stateStore.set(currentTicket.userId, MatchmakingState.WAITING);
        this.stateStore.set(candidate.userId, MatchmakingState.WAITING);
      };

      if (!ageCompatible || blocked || declined) {
        rollback();
        continue;
      }

      if (previousCall) {
        if (!allowPreviousCalls) {
          rollback();
          continue;
        }
        // Only allow if they share at least one interest
        const hasSharedInterest = currentTicket.interests.some((i) =>
          candidate.interests.includes(i),
        );
        if (!hasSharedInterest) {
          rollback();
          continue;
        }
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

    const now = Date.now();
    const waitTimeA = now - new Date(ticket.createdAt).getTime();
    const waitTimeB = now - new Date(match.createdAt).getTime();

    const sharedCount = ticket.interests.filter((i) =>
      match.interests.includes(i),
    ).length;
    const totalUnique = new Set([...ticket.interests, ...match.interests]).size;
    const mutualInterests =
      totalUnique > 0 ? Math.round((sharedCount / totalUnique) * 100) : 0;

    await this.matchHistoryRepository.save(
      this.matchHistoryRepository.create({
        userA,
        userB,
        roomId,
        outcome: 'default',
        mutualInterests,
      }),
    );

    await Promise.all([
      this.updateAvgWaitTime(ticket.userId, waitTimeA),
      this.updateAvgWaitTime(match.userId, waitTimeB),
      this.streakService.updateStreak(ticket.userId),
      this.streakService.updateStreak(match.userId),
    ]);

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

  private async hasPreviousCall(
    userIdA: string,
    userIdB: string,
  ): Promise<boolean> {
    const previous = await this.matchHistoryRepository.findOne({
      where: [
        { userA: { id: userIdA }, userB: { id: userIdB }, outcome: 'default' },
        { userA: { id: userIdB }, userB: { id: userIdA }, outcome: 'default' },
        { userA: { id: userIdA }, userB: { id: userIdB }, outcome: 'matched' },
        { userA: { id: userIdB }, userB: { id: userIdA }, outcome: 'matched' },
      ],
    });
    return Boolean(previous);
  }

  private async hasDeclinedMatch(
    userIdA: string,
    userIdB: string,
  ): Promise<boolean> {
    const declined = await this.matchHistoryRepository.findOne({
      where: [
        { userA: { id: userIdA }, userB: { id: userIdB }, outcome: 'declined' },
        { userA: { id: userIdB }, userB: { id: userIdA }, outcome: 'declined' },
      ],
    });
    return Boolean(declined);
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

  private async updateAvgWaitTime(
    userId: string,
    newWaitTime: number,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true, avgWaitTime: true } as never,
    });

    if (!user) return;

    const matchCount = await this.matchHistoryRepository.count({
      where: [
        { userA: { id: userId }, outcome: 'default' },
        { userB: { id: userId }, outcome: 'default' },
        { userA: { id: userId }, outcome: 'matched' },
        { userB: { id: userId }, outcome: 'matched' },
      ],
    });

    const prevAvg = user.avgWaitTime ?? 0;
    const newAvg = (prevAvg * (matchCount - 1) + newWaitTime) / matchCount;

    await this.usersRepository.update(userId, { avgWaitTime: newAvg });
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
