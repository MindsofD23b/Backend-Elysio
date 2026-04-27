import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaService } from './media.service';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { VideoGateway } from './video.gateway';

@Module({
  imports: [AuthModule],
  controllers: [VideoController],
  providers: [MediaService, VideoService, VideoGateway],
})
export class VideoModule {}
