import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { R2Service } from './r2.service';
import { R2_CLIENT } from './r2.constants';

export { R2_CLIENT } from './r2.constants';

@Module({
  providers: [
    {
      provide: R2_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new S3Client({
          region: 'auto',
          endpoint: `https://${config.getOrThrow('CF_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
          },
        });
      },
    },
    R2Service,
  ],
  exports: [R2Service],
})
export class R2Module {}
