import { Injectable, OnModuleInit } from '@nestjs/common'
import * as mediasoup from 'mediasoup'

@Injectable()
export class MediaService implements OnModuleInit {

    private worker: mediasoup.types.Worker
    private router: mediasoup.types.Router

    async onModuleInit() {
        await this.startWorker()
    }

    private async startWorker() {
        this.worker = await mediasoup.createWorker({
            logLevel: 'warn',
        })

        this.worker.on('died', () => {
            console.error('mediasoup worker died, restarting...')
            setTimeout(() => this.startWorker(), 2000)
        })

        this.router = await this.worker.createRouter({
            mediaCodecs: [
                {
                    kind: 'audio',
                    mimeType: 'audio/opus',
                    clockRate: 48000,
                    channels: 2,
                },
                {
                    kind: 'video',
                    mimeType: 'video/VP8',
                    clockRate: 90000,
                    parameters: {},
                },
            ],
        })

        console.log('mediasoup worker + router ready')
    }

    getRtpCapabilities() {
        return this.router.rtpCapabilities
    }

    async createTransport() {
        const transport = await this.router.createWebRtcTransport({
            listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }], // announcedIp für LAN/Production anpassen
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        })

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }
    }
}