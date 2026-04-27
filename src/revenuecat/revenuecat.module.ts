import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { RevenueCatController } from './revenuecat.controller';
import { RevenueCatService } from './revenuecat.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [RevenueCatController],
  providers: [RevenueCatService],
})
export class RevenueCatModule {}
