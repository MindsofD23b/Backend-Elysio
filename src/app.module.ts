import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { R2Module } from './r2/r2.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

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
    R2Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}