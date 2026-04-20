import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MatchHistory } from 'src/matchmaking/entities/match-history.entity';
import { R2Module } from 'src/r2/r2.module';
import { ProfilePicture } from './entities/profile-picture.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MatchHistory, ProfilePicture]),
    R2Module],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }
