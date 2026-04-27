import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { RevenueCatService } from './revenuecat.service';
import type { RevenueCatWebhookPayload } from './revenuecat.service';

@SkipThrottle()
@Controller('webhooks')
export class RevenueCatController {
  private readonly logger = new Logger(RevenueCatController.name);

  constructor(private readonly revenueCatService: RevenueCatService) {}

  @Post('revenuecat')
  @HttpCode(200)
  async handleWebhook(
    @Headers('authorization') authorization: string,
    @Body() payload: RevenueCatWebhookPayload,
  ) {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!secret || authorization !== secret) {
      this.logger.warn('RevenueCat webhook rejected: invalid authorization');
      throw new UnauthorizedException();
    }

    await this.revenueCatService.handleEvent(payload);

    return { received: true };
  }
}
