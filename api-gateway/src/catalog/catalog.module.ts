import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { elasticsearchConfig } from '../config/elasticsearch.config.js';
import { redisConfig } from '../config/redis.config.js';
import { AdminCatalogClient } from './admin-catalog.client.js';
import { CATALOG_CACHE_TTL_MS } from './catalog-cache.js';
import { CatalogSyncController } from './catalog-sync.controller.js';
import { CatalogSyncService } from './catalog-sync.service.js';
import { Category } from './category.entity.js';
import { ProductSearch } from './product-search.js';
import { Product } from './product.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsResolver } from './products.resolver.js';
import { ProductsService } from './products.service.js';

/** When Redis doesn't answer within this time, the products are read from the database instead */
const REDIS_TIMEOUT_MS = 200;

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Product]),
    // Product search. Fail fast, no retries: when Elasticsearch doesn't answer, searches use the database instead
    ElasticsearchModule.registerAsync({
      inject: [elasticsearchConfig.KEY],
      useFactory: (elasticsearch: ConfigType<typeof elasticsearchConfig>) => ({
        node: elasticsearch.node,
        requestTimeout: 1000,
        maxRetries: 0,
      }),
    }),
    // The catalog's own cache: its keys are prefixed "catalog::", so clearing it never touches other Redis data.
    // A cache outage must not take the API down: while Redis is unreachable, calls fail fast (no queueing,
    // no endless reconnecting — the next call tries again) and the products are read from the database.
    CacheModule.registerAsync({
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>) => ({
        stores: [
          createKeyv(
            {
              url: redis.cacheUrl,
              disableOfflineQueue: true,
              socket: {
                reconnectStrategy: false,
                connectTimeout: REDIS_TIMEOUT_MS,
              },
            },
            {
              namespace: 'catalog',
              throwOnConnectError: false,
              connectionTimeout: REDIS_TIMEOUT_MS,
            },
          ),
        ],
        ttl: CATALOG_CACHE_TTL_MS,
      }),
    }),
  ],
  controllers: [ProductsController, CatalogSyncController],
  providers: [
    ProductsService,
    ProductsResolver,
    ProductSearch,
    CatalogSyncService,
    AdminCatalogClient,
  ],
  // The product cache: stock changes (inventory) clear it too
  exports: [CacheModule],
})
export class CatalogModule {}
