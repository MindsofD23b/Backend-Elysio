import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as mediasoup from 'mediasoup';

interface Peer {
  transports: Map<string, mediasoup.types.WebRtcTransport>;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

interface Room {
  router: mediasoup.types.Router;
  peers: Map<string, Peer>;
}

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private worker: mediasoup.types.Worker;
  private rooms: Map<string, Room> = new Map();

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  async onModuleInit() {
    await this.startWorker();
  }

  private async startWorker() {
    this.worker = await mediasoup.createWorker({
      logLevel: 'warn',
      rtcMinPort: 10000,
      rtcMaxPort: 10999,
    });

    this.worker.on('died', () => {
      this.logger.error('mediasoup worker died – restarting in 2s');
      setTimeout(() => void this.startWorker(), 2000);
    });

    this.logger.log('mediasoup worker started');
  }

  // ─── Room ─────────────────────────────────────────────────────────────────

  async getOrCreateRoom(roomId: string): Promise<Room> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    const router = await this.worker.createRouter({
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
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
          },
        },
      ],
    });

    const room: Room = { router, peers: new Map() };
    this.rooms.set(roomId, room);
    this.logger.log(`Room created: ${roomId}`);
    return room;
  }

  getRtpCapabilities(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    return room.router.rtpCapabilities;
  }

  // ─── Peer ─────────────────────────────────────────────────────────────────

  async joinRoom(roomId: string, peerId: string) {
    const room = await this.getOrCreateRoom(roomId)

    console.log('[joinRoom BEFORE]', {
      pid: process.pid,
      roomId,
      peerId,
      peers: [...room.peers.keys()],
    })

    if (!room.peers.has(peerId)) {
      room.peers.set(peerId, {
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      })
    }

    console.log('[joinRoom AFTER]', {
      pid: process.pid,
      roomId,
      peerId,
      peers: [...room.peers.keys()],
    })
  }

  leaveRoom(roomId: string, peerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const peer = room.peers.get(peerId);
    if (peer) {
      peer.transports.forEach((t) => t.close());
      room.peers.delete(peerId);
      this.logger.log(`Peer ${peerId} left room ${roomId}`);
    }

    // Leeren Raum aufräumen
    if (room.peers.size === 0) {
      room.router.close();
      this.rooms.delete(roomId);
      this.logger.log(`Room ${roomId} closed (empty)`);
    }
  }

  // ─── Transport ────────────────────────────────────────────────────────────

  async createTransport(roomId: string, peerId: string) {
    const room = await this.getOrCreateRoom(roomId)

    console.log('[createTransport CHECK]', {
      pid: process.pid,
      roomId,
      peerId,
      peers: [...room.peers.keys()],
    })

    const peer = room.peers.get(peerId)

    if (!peer) {
      throw new Error(`Peer ${peerId} not in room ${roomId}`)
    }

    const transport = await room.router.createWebRtcTransport({
      listenInfos: [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedAddress: 'elysio.jamiepoeffel.ch',
        },
        {
          protocol: 'tcp',
          ip: '0.0.0.0',
          announcedAddress: 'elysio.jamiepoeffel.ch',
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    })

    peer.transports.set(transport.id, transport)

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    }
  }

  async connectTransport(
    roomId: string,
    peerId: string,
    transportId: string,
    dtlsParameters: mediasoup.types.DtlsParameters,
  ) {
    const transport = this.getTransport(roomId, peerId, transportId);
    await transport.connect({ dtlsParameters });
    this.logger.log(`Transport ${transportId} connected for peer ${peerId}`);
  }

  // ─── Producer ─────────────────────────────────────────────────────────────

  async createProducer(
    roomId: string,
    peerId: string,
    transportId: string,
    kind: mediasoup.types.MediaKind,
    rtpParameters: mediasoup.types.RtpParameters,
  ) {
    const transport = this.getTransport(roomId, peerId, transportId);
    const producer = await transport.produce({ kind, rtpParameters });

    const peer = this.getPeer(roomId, peerId);
    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      producer.close();
      peer.producers.delete(producer.id);
    });

    this.logger.log(
      `Producer ${producer.id} (${kind}) created for peer ${peerId}`,
    );
    return { id: producer.id };
  }

  // ─── Consumer ─────────────────────────────────────────────────────────────

  async createConsumer(
    roomId: string,
    consumerPeerId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: mediasoup.types.RtpCapabilities,
  ) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);

    // Prüfen ob der Router den Consumer unterstützt
    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume: incompatible RTP capabilities');
    }

    const transport = this.getTransport(roomId, consumerPeerId, transportId);

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true, // Client muss resume() aufrufen
    });

    const peer = this.getPeer(roomId, consumerPeerId);
    peer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    this.logger.log(
      `Consumer ${consumer.id} created for peer ${consumerPeerId}`,
    );

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async resumeConsumer(roomId: string, peerId: string, consumerId: string) {
    const peer = this.getPeer(roomId, peerId);
    const consumer = peer.consumers.get(consumerId);
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`);
    await consumer.resume();
  }

  // ─── Hilfsmethoden ────────────────────────────────────────────────────────

  getProducers(roomId: string, excludePeerId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const result: { peerId: string; producerId: string; kind: string }[] = [];

    room.peers.forEach((peer, peerId) => {
      if (peerId === excludePeerId) return;
      peer.producers.forEach((producer) => {
        result.push({ peerId, producerId: producer.id, kind: producer.kind });
      });
    });

    return result;
  }

  private getPeer(roomId: string, peerId: string): Peer {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room ${roomId} not found`);
    const peer = room.peers.get(peerId);
    if (!peer) throw new Error(`Peer ${peerId} not found`);
    return peer;
  }

  private getTransport(
    roomId: string,
    peerId: string,
    transportId: string,
  ): mediasoup.types.WebRtcTransport {
    const peer = this.getPeer(roomId, peerId);
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);
    return transport;
  }
}
