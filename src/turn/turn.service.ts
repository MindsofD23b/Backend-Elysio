import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TurnService {
  constructor(private config: ConfigService) {}

  getIceServers(ttlSeconds = 3600) {
    const secret = this.config.getOrThrow<string>('TURN_SECRET');
    const timestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${timestamp}`;
    const credential = crypto
      .createHmac('sha1', secret)
      .update(username)
      .digest('base64');

    return [
      {
        urls: [
          'turn:elysioturn.jamiepoeffel.ch:3478?transport=udp',
          'turn:elysioturn.jamiepoeffel.ch:3478?transport=tcp',
          'turns:elysioturn.jamiepoeffel.ch:5349?transport=tcp',
        ],
        username,
        credential,
      },
    ];
  }
}
