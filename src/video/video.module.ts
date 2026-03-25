import { Module } from '@nestjs/common';
import { MediaService } from './media.service'
import { VideoController } from './video.controller'
import { VideoService } from './video.service'

@Module({
  controllers: [VideoController],
  providers: [MediaService, VideoService],
})
export class VideoModule { }