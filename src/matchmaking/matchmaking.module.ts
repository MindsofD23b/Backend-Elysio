import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingGateway } from './matchmaking.gateway';

import { User } from '../database/entities/user.entity';
import { UserBlock } from '../database/entities/user-block.entity';
import { MatchHistory } from '../database/entities/match-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserBlock, MatchHistory]), AuthModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingService, MatchmakingGateway],
  exports: [MatchmakingService, MatchmakingGateway],
})
export class MatchmakingModule {}