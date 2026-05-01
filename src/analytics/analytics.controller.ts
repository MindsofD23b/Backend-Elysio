import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getAnalytics(@Request() req) {
    return this.analyticsService.getUsersAnalytics(req.user.sub);
  }
}
