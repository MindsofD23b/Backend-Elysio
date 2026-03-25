import { Controller, Get, Post } from '@nestjs/common'
import { MediaService } from './media.service'

@Controller('video')
export class VideoController {
    constructor(private readonly mediaService: MediaService) {}

    @Get('rtp-capabilities')
    getRtpCapabilities() {
        return this.mediaService.getRtpCapabilities()
    }

    @Post('transport')
    async initTransport() {
        return this.mediaService.createTransport()
    }
}