import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

type RevenueCatEventType = string;

export interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string;
  entitlement_ids: string[] | null;
  expiration_at_ms: number | null;
}

export interface RevenueCatWebhookPayload {
  api_version: string;
  event: RevenueCatEvent;
}

const ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

const DEACTIVATE_EVENTS = new Set(['EXPIRATION', 'SUBSCRIPTION_PAUSED']);

@Injectable()
export class RevenueCatService {
  private readonly logger = new Logger(RevenueCatService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleEvent(payload: RevenueCatWebhookPayload): Promise<void> {
    const { type, app_user_id, entitlement_ids } = payload.event;

    this.logger.log(`RevenueCat event: ${type} for user ${app_user_id}`);

    if (ACTIVATE_EVENTS.has(type)) {
      const plan = this.resolvePlan(entitlement_ids);
      await this.setSubscription(app_user_id, plan);
      return;
    }

    if (DEACTIVATE_EVENTS.has(type)) {
      await this.setSubscription(app_user_id, 'free');
      return;
    }

    // CANCELLATION: user cancelled but keeps access until expiration date.
    // RevenueCat will send EXPIRATION when it actually runs out — no action needed now.
    this.logger.log(`Event ${type} requires no immediate subscription change`);
  }

  private resolvePlan(
    entitlementIds: string[] | null,
  ): 'free' | 'premium' | 'gold' {
    if (!entitlementIds || entitlementIds.length === 0) return 'free';
    if (entitlementIds.includes('gold')) return 'gold';
    if (entitlementIds.includes('premium')) return 'premium';
    return 'free';
  }

  private async setSubscription(
    userId: string,
    plan: 'free' | 'premium' | 'gold',
  ) {
    const result = await this.userRepository.update(
      { id: userId },
      { subscriptionStatus: plan },
    );

    if (result.affected === 0) {
      this.logger.warn(
        `User ${userId} not found when applying subscription ${plan}`,
      );
    } else {
      this.logger.log(`User ${userId} subscription set to ${plan}`);
    }
  }
}
