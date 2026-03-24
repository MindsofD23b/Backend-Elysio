import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Interest } from './entities/interest.entity';
import { InterestCategory } from './entities/interest-category.entity';
import { UserInterest } from './entities/user-interest.entity';

import { InterestsService } from './interests.service';
import { InterestsController } from './interests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interest, InterestCategory, UserInterest]),
  ],
  controllers: [InterestsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}
