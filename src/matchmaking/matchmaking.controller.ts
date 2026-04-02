import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { MatchmakingService } from './matchmaking.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
  };
};

@Controller('matchmaking')
@UseGuards(AuthGuard('jwt'))
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('activate')
  async activateCall(@Req() req: AuthenticatedRequest) {
    return this.matchmakingService.activateCall(req.user.sub);
  }

  @Post('deactivate')
  async deactivateCall(@Req() req: AuthenticatedRequest) {
    return this.matchmakingService.deactivateCall(req.user.sub);
  }

  @Get('me')
  getMyQueueStatus(@Req() req: AuthenticatedRequest) {
    return this.matchmakingService.getMyQueueStatus(req.user.sub);
  }
}
