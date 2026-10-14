import { registerAs } from '@nestjs/config';

/**
 * Redis connections, injected with `@Inject(redisConfig.KEY)`.
 * The cache and the queues use separate Redis databases: clearing the cache must never touch queued jobs.
 */
export const redisConfig = registerAs('redis', () => ({
  cacheUrl: process.env.CACHE_REDIS_URL,
  queueUrl: process.env.QUEUE_REDIS_URL,
}));
