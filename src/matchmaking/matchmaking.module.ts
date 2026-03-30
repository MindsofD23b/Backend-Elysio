import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MatchmakingService } from './matchmaking.service';
import { User } from '../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}