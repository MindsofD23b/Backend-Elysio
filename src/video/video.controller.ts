import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { MediaService } from './media.service';
import type {
    DtlsParameters,
    RtpParameters,
    RtpCapabilities,
} from 'mediasoup/types';
import { VideoGateway } from './video.gateway';

@Controller('video')
export class VideoController {
    constructor(
        private readonly mediaService: MediaService,
        private readonly videoGateway: VideoGateway,
    ) { }

    @Post('room/:roomId/join')
    async joinRoom(
        @Param('roomId') roomId: string,
        @Body('peerId') peerId: string,
    ) {
        await this.mediaService.getOrCreateRoom(roomId);
        await this.mediaService.joinRoom(roomId, peerId);

        const rtpCapabilities = this.mediaService.getRtpCapabilities(roomId);
        return { rtpCapabilities };
    }

    @Delete('room/:roomId/leave')
    leaveRoom(@Param('roomId') roomId: string, @Body('peerId') peerId: string) {
        this.mediaService.leaveRoom(roomId, peerId);
        return { left: true };
    }

    @Post('room/:roomId/transport')
    async createTransport(
        @Param('roomId') roomId: string,
        @Body('peerId') peerId: string,
    ) {
        return this.mediaService.createTransport(roomId, peerId);
    }

    @Post('room/:roomId/transport/:transportId/connect')
    async connectTransport(
        @Param('roomId') roomId: string,
        @Param('transportId') transportId: string,
        @Body('peerId') peerId: string,
        @Body('dtlsParameters') dtlsParameters: DtlsParameters,
    ) {
        await this.mediaService.connectTransport(
            roomId,
            peerId,
            transportId,
            dtlsParameters,
        );
        return { connected: true };
    }

    @Post('room/:roomId/transport/:transportId/produce')
    async produce(
        @Param('roomId') roomId: string,
        @Param('transportId') transportId: string,
        @Body('peerId') peerId: string,
        @Body('kind') kind: 'audio' | 'video',
        @Body('rtpParameters') rtpParameters: RtpParameters,
    ) {
        const result = await this.mediaService.createProducer(
            roomId,
            peerId,
            transportId,
            kind,
            rtpParameters,
        );

        this.videoGateway.notifyNewProducer(roomId, result.id, peerId);

        return result;
    }

    @Get('room/:roomId/producers')
    getProducers(
        @Param('roomId') roomId: string,
        @Query('peerId') peerId: string,
    ) {
        return this.mediaService.getProducers(roomId, peerId);
    }

    @Post('room/:roomId/transport/:transportId/consume')
    async consume(
        @Param('roomId') roomId: string,
        @Param('transportId') transportId: string,
        @Body('peerId') peerId: string,
        @Body('producerId') producerId: string,
        @Body('rtpCapabilities') rtpCapabilities: RtpCapabilities,
    ) {
        return this.mediaService.createConsumer(
            roomId,
            peerId,
            transportId,
            producerId,
            rtpCapabilities,
        );
    }

    @Post('room/:roomId/consumer/:consumerId/resume')
    async resumeConsumer(
        @Param('roomId') roomId: string,
        @Param('consumerId') consumerId: string,
        @Body('peerId') peerId: string,
    ) {
        await this.mediaService.resumeConsumer(roomId, peerId, consumerId);
        return { resumed: true };
    }
}