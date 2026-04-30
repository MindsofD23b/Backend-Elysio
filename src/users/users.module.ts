import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MatchHistory } from '../matchmaking/entities/match-history.entity';
import { ProfilePicture } from './entities/profile-picture.entity';
import { ConfigModule } from '@nestjs/config';
import { R2Module } from '../r2/r2.module';
import { Interest } from '../interests/entities/interest.entity';
import { UserInterest } from '../interests/entities/user-interest.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, Interest, UserInterest, MatchHistory, ProfilePicture]),
    R2Module,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
