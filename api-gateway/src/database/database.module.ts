import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from '../config/database.config.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (database: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        ...database,
        // Each feature module registers its own entities (TypeOrmModule.forFeature)
        autoLoadEntities: true,
        // The schema is changed only by migrations
        synchronize: false,
        // Rows loaded from the database skip the entity constructor, so new ids are only generated for new objects
        entitySkipConstructor: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
