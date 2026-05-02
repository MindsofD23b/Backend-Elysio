import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { StreakService } from './streak.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}
