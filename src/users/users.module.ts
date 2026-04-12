import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MatchHistory } from 'src/matchmaking/entities/match-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, MatchHistory])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
