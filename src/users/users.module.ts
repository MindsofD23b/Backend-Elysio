import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { MatchHistory } from 'src/matchmaking/entities/match-history.entity';
import { ProfilePicture } from './entities/profile-picture.entity';
import { S3Client } from '@aws-sdk/client-s3';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { R2Service } from 'src/r2/r2.service';

export const R2_CLIENT = 'R2_CLIENT';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, MatchHistory, ProfilePicture]),
  ],
  controllers: [UsersController],
  providers: [
    {
      provide: R2_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: 'auto',
          endpoint: `https://${config.getOrThrow('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
          },
        }),
    },
    R2Service,
    UsersService,
  ],
  exports: [UsersService],
})
export class UsersModule {}