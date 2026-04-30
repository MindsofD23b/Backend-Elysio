import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post('decline')
  async declineMatch(
    @Req() req: AuthenticatedRequest,
    @Body() body: { roomId: string },
  ) {
    return this.matchmakingService.declineMatch(req.user.sub, body.roomId);
  }

  @Get('me')
  getMyQueueStatus(@Req() req: AuthenticatedRequest) {
    return this.matchmakingService.getMyQueueStatus(req.user.sub);
  }

  @Get('room')
  getMyRoomId(@Req() req: AuthenticatedRequest) {
    return this.matchmakingService.getMyRoomId(req.user.sub);
  }
}
