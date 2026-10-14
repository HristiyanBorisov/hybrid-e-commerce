import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { redisConfig } from '../config/redis.config.js';

/**
 * Background jobs (BullMQ, stored in Redis). Each feature registers its own queue and processor;
 * the connection and the retry rules are shared.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        connection: { url: redis.queueUrl },
        defaultJobOptions: {
          // A failed job is retried after 10 s, 20 s, 40 s and 80 s
          attempts: 5,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: true,
          // The last 1000 failed jobs are kept, to see what went wrong
          removeOnFail: 1000,
        },
      }),
    }),
  ],
})
export class QueueModule {}
