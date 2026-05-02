import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';

import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';
import { StreakService } from './streak.service';

import { User } from '../users/entities/user.entity';
import { UserBlock } from '../interests/entities/user-block.entity';
import { MatchHistory } from './entities/match-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserBlock, MatchHistory]),
    AuthModule,
  ],
  controllers: [MatchmakingController],
  providers: [MatchmakingService, MatchmakingGateway, StreakService],
  exports: [MatchmakingService, MatchmakingGateway, StreakService],
})
export class MatchmakingModule {}
