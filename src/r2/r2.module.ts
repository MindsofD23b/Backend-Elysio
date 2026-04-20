import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { R2Service } from './r2.service';

export const R2_CLIENT = 'R2_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: R2_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: 'auto',
          endpoint: `https://${config.getOrThrow('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
          },
        }),
    },
    R2Service,
  ],
  exports: [R2Service],
})
export class R2Module {}