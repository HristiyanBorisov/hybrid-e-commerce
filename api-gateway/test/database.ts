import { Cache } from '@nestjs/cache-manager';
import { INestApplication } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { DataSource } from 'typeorm';
import { elasticsearchConfig } from '../src/config/elasticsearch.config.js';

/**
 * Empties every table (except the migrations table), and the product cache and search index built from them,
 * so each test starts from a clean database.
 * Refuses to run unless the app is connected to a "_test" database — tests must never wipe dev data.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);
  const [{ database }] = await dataSource.query<{ database: string }[]>(
    'SELECT current_database() AS database',
  );

  if (!database.endsWith('_test')) {
    throw new Error(
      `Refusing to empty "${database}": it's not a test database.`,
    );
  }

  const tables = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );

  await dataSource.query(
    `TRUNCATE ${tables.map(({ tablename }) => `"${tablename}"`).join(', ')} CASCADE`,
  );
  await app.get(Cache).clear();
  await app.get(ElasticsearchService).deleteByQuery(
    {
      index: app.get<ConfigType<typeof elasticsearchConfig>>(
        elasticsearchConfig.KEY,
      ).index,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
    },
    { ignore: [404] },
  );
}
