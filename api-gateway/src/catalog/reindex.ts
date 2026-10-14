import { Cache } from '@nestjs/cache-manager';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ProductSearch } from './product-search.js';

/**
 * Builds the search index again from the database (`make reindex`) — e.g. after Elasticsearch lost its data or the
 * index's mapping changed. The product cache is cleared too: cached search results came from the old index.
 */
async function reindex(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const count = await app.get(ProductSearch).reindexAll();
  await app.get(Cache).clear();
  console.log(`Search index rebuilt: ${count} products.`);

  await app.close();
}
await reindex();
