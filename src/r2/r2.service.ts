// src/r2/r2.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_CLIENT } from './r2.constants';
import { randomUUID } from 'crypto';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly bucket: string;

  constructor(
    @Inject(R2_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.getOrThrow('R2_BUCKET_NAME');
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    console.log(
      `[R2] Upload start — userId: ${userId}, bucket: ${this.bucket}`,
    );
    console.log(
      `[R2] File: ${file.originalname}, size: ${file.size}, mime: ${file.mimetype}`,
    );

    const ext = file.originalname.split('.').pop();
    const key = `profiles/${userId}/${randomUUID()}.${ext}`;
    console.log(`[R2] Key: ${key}`);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
        }),
      );
      console.log(`[R2] PutObject success: ${key}`);
    } catch (err) {
      console.error(`[R2] PutObject failed:`, err);
      throw err;
    }

    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted ${key}`);
  }
}
