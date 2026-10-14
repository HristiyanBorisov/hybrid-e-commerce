import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware.js';
import { appConfig } from './config/app.config.js';
import { authConfig } from './config/auth.config.js';
import { databaseConfig } from './config/database.config.js';
import { elasticsearchConfig } from './config/elasticsearch.config.js';
import { validateEnv } from './config/env.validation.js';
import { internalApiConfig } from './config/internal-api.config.js';
import { mailConfig } from './config/mail.config.js';
import { redisConfig } from './config/redis.config.js';
import { DatabaseModule } from './database/database.module.js';
import { GraphqlApiModule } from './graphql/graphql-api.module.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { QueueModule } from './queue/queue.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Docker Compose already loads the .env file into the environment
      ignoreEnvFile: true,
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        redisConfig,
        internalApiConfig,
        mailConfig,
        elasticsearchConfig,
      ],
    }),
    DatabaseModule,
    QueueModule,
    GraphqlApiModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestLoggingMiddleware)
      // Docker and nginx call the health check every few seconds — logging it would bury the real requests
      .exclude('health')
      .forRoutes('*path');
  }
}
