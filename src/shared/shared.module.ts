import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from 'process';
import { CacheService } from 'src/shared/cache.service';

@Module({
  providers: [
    CacheService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: env.REDIS_HOST,
          port: parseInt(env.REDIS_PORT ?? '6379'),
          password: env.REDIS_PASSWORD,
        });
      },
    },
  ],
  exports: [CacheService],
})
export class SharedModule {}
