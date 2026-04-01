import { Injectable } from '@nestjs/common';
import { MediaService } from './media.service';

@Injectable()
export class VideoService {
  constructor(private mediaService: MediaService) {}

  // Hier später Room-Management, Producer/Consumer-Logik
}
