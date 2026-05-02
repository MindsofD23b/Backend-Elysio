import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';
import { User } from '../users/entities/user.entity';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MatchHistory, User]),
    MatchmakingModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
