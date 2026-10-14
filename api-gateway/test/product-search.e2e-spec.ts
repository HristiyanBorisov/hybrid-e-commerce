import { INestApplication } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { CatalogSyncService } from '../src/catalog/catalog-sync.service.js';
import { ProductResponseDto } from '../src/catalog/dto/product-response.dto.js';
import { ProductSearch } from '../src/catalog/product-search.js';
import { categoryMessage, syncCategory, syncProduct } from './catalog.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';

describe('Product search with Elasticsearch (e2e)', () => {
  let app: INestApplication<App>;
  let phones: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    phones = await syncCategory(app, { name: 'Phones', slug: 'phones' });
    const laptops = await syncCategory(app, {
      name: 'Laptops',
      slug: 'laptops',
    });
    await syncProduct(app, {
      categoryId: phones,
      sku: 'PHN-001',
      name: 'Pixel Pro 9',
      priceCents: 79900,
    });
    await syncProduct(app, {
      categoryId: phones,
      sku: 'PHN-002',
      name: 'Galaxy Ultra S',
      priceCents: 99900,
    });
    await syncProduct(app, {
      categoryId: laptops,
      sku: 'LAP-001',
      name: 'Gaming Laptop 16',
      priceCents: 189900,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  async function search(params: string, server = app): Promise<string[]> {
    const response = await request(server.getHttpServer())
      .get(`/api/v1/products?${params}`)
      .expect(200);

    return response.body.data.map(
      (product: ProductResponseDto) => product.name,
    );
  }

  it('forgives typos and completes words cut short', async () => {
    expect(await search('search=pixl')).toEqual(['Pixel Pro 9']);
    expect(await search('search=lapt')).toEqual(['Gaming Laptop 16']);
    expect(await search('search=galxy%20ultra')).toEqual(['Galaxy Ultra S']);
  });

  it('matches a SKU exactly or by its beginning, never with typos', async () => {
    expect(await search('search=PHN-001')).toEqual(['Pixel Pro 9']);
    expect(await search('search=phn')).toEqual(
      expect.arrayContaining(['Pixel Pro 9', 'Galaxy Ultra S']),
    );
    expect(await search('search=phn')).toHaveLength(2);
    expect(await search('search=PHN-009')).toEqual([]);
  });

  it('ranks a match in the name above one only in the description or the category', async () => {
    await syncProduct(app, {
      categoryId: phones,
      name: 'Phone Case',
      description: 'Fits every phone',
    });
    await syncProduct(app, {
      categoryId: phones,
      name: 'Screen Protector',
      description: 'Glass',
    });

    const results = await search('search=phone');

    expect(results[0]).toBe('Phone Case');
    expect(results).toContain('Screen Protector'); // in the "Phones" category
  });

  it('combines the search with the category, price and paging filters', async () => {
    const response = await request(app.getHttpServer())
      .get(
        '/api/v1/products?search=pro&category=phones&maxPriceCents=80000&limit=1',
      )
      .expect(200);

    expect(
      response.body.data.map((product: ProductResponseDto) => product.name),
    ).toEqual(['Pixel Pro 9']);
    expect(response.body.meta).toEqual({
      page: 1,
      limit: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it('follows the catalog: deleted products drop out, renamed categories are found by their new name', async () => {
    await syncProduct(app, {
      name: 'Pixel Pro 8',
      deletedAt: new Date().toISOString(),
    });
    await app
      .get(CatalogSyncService)
      .saveCategory(
        phones,
        categoryMessage({ name: 'Smartphones', slug: 'phones', version: 2 }),
      );

    expect(await search('search=pixel')).toEqual(['Pixel Pro 9']);
    expect(await search('search=smartphones')).toEqual(
      expect.arrayContaining(['Pixel Pro 9', 'Galaxy Ultra S']),
    );
  });

  it('creates and fills a missing index on startup', async () => {
    const elasticsearch = app.get(ElasticsearchService);
    await elasticsearch.indices.delete({ index: 'products_test' });

    await app.get(ProductSearch).onApplicationBootstrap();

    expect(await elasticsearch.indices.exists({ index: 'products_test' })).toBe(
      true,
    );
    expect(await search('search=pixl')).toEqual(['Pixel Pro 9']);
  });

  it('can be rebuilt from the database (make reindex)', async () => {
    await expect(app.get(ProductSearch).reindexAll()).resolves.toBe(3);

    expect(await search('search=pixl')).toEqual(['Pixel Pro 9']);
  });

  describe('when Elasticsearch is down', () => {
    let appWithoutSearch: INestApplication<App>;
    const elasticsearchUrl = process.env.ELASTICSEARCH_URL;

    beforeAll(async () => {
      process.env.ELASTICSEARCH_URL = 'http://127.0.0.1:1'; // nothing listens there
      appWithoutSearch = await createTestApp();
    });

    afterAll(async () => {
      process.env.ELASTICSEARCH_URL = elasticsearchUrl;
      await appWithoutSearch.close();
    });

    it('still searches — in the database, without typo tolerance', async () => {
      expect(await search('search=pixel', appWithoutSearch)).toEqual([
        'Pixel Pro 9',
      ]);
      expect(await search('search=pixl', appWithoutSearch)).toEqual([]);
    });

    it('still saves catalog changes — the index catches up later (make reindex)', async () => {
      await syncProduct(appWithoutSearch, { name: 'Pixel Pro 10' });

      expect(await search('search=pixel', appWithoutSearch)).toContain(
        'Pixel Pro 10',
      );
    });
  });
});
