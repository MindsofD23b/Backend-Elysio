import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InterestsModule } from './interests/interests.module';
import { EmailModule } from './email/email.module';
import { VideoModule } from './video/video.module';
import { ChatModule } from './chats/chats.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RevenueCatModule } from './revenuecat/revenuecat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    UsersModule,
    AuthModule,
    InterestsModule,
    EmailModule,
    VideoModule,
    ChatModule,
    MatchmakingModule,
    NotificationsModule,
    RevenueCatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}