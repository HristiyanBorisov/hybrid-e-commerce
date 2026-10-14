import { INestApplication, UnprocessableEntityException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AdminCatalogClient } from '../src/catalog/admin-catalog.client.js';
import { ProductResponseDto } from '../src/catalog/dto/product-response.dto.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { productMessage, syncCategory, syncProduct } from './catalog.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { createUser, tokenFor } from './users.js';

describe('Products (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  function get(url: string): request.Test {
    return request(app.getHttpServer()).get(url);
  }

  async function names(url: string): Promise<string[]> {
    const response = await get(url).expect(200);

    return response.body.data.map(
      (product: ProductResponseDto) => product.name,
    );
  }

  describe('GET /api/v1/products', () => {
    it('is public: products newest first, with their category and pagination info', async () => {
      const lighting = await syncCategory(app, {
        name: 'Lighting',
        slug: 'lighting',
      });
      await syncProduct(app, {
        categoryId: lighting,
        name: 'Old Lamp',
        createdAt: '2026-10-01T10:00:00Z',
      });
      await syncProduct(app, {
        categoryId: lighting,
        name: 'New Lamp',
        createdAt: '2026-10-02T10:00:00Z',
      });

      const response = await get('/api/v1/products?limit=1').expect(200);

      expect(response.body.data).toEqual([
        expect.objectContaining({
          name: 'New Lamp',
          category: { id: lighting, name: 'Lighting', slug: 'lighting' },
        }),
      ]);
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
    });

    it('filters by category (subcategories included), name or SKU, and price', async () => {
      const home = await syncCategory(app, { slug: 'home' });
      const lighting = await syncCategory(app, {
        slug: 'lighting',
        parentId: home,
      });
      const books = await syncCategory(app, { slug: 'books' });
      await syncProduct(app, {
        categoryId: home,
        name: 'Rug',
        sku: 'HOM-1',
        priceCents: 9900,
      });
      await syncProduct(app, {
        categoryId: lighting,
        name: 'Desk Lamp',
        sku: 'LMP-1',
        priceCents: 2990,
      });
      await syncProduct(app, {
        categoryId: books,
        name: 'Lamp Repair Guide',
        sku: 'BOK-1',
        priceCents: 1500,
      });

      expect(await names('/api/v1/products?category=home')).toEqual(
        expect.arrayContaining(['Rug', 'Desk Lamp']),
      );
      expect(await names('/api/v1/products?category=home')).toHaveLength(2);
      expect(await names('/api/v1/products?search=LAMP')).toHaveLength(2);
      expect(await names('/api/v1/products?search=hom-')).toEqual(['Rug']);
      expect(
        await names(
          '/api/v1/products?search=lamp&minPriceCents=2000&maxPriceCents=5000',
        ),
      ).toEqual(['Desk Lamp']);
      expect(await names('/api/v1/products?category=no-such-category')).toEqual(
        [],
      );
    });

    it('leaves out deleted products', async () => {
      await syncProduct(app, { name: 'Visible' });
      await syncProduct(app, {
        name: 'Deleted',
        deletedAt: new Date().toISOString(),
      });

      expect(await names('/api/v1/products')).toEqual(['Visible']);
    });

    it('answers invalid filters with 422', async () => {
      const response = await get(
        '/api/v1/products?minPriceCents=-1&limit=500',
      ).expect(422);

      expect(response.body.errors).toEqual({
        limit: expect.any(Array),
        minPriceCents: expect.any(Array),
      });
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('returns one product', async () => {
      const id = await syncProduct(app, { sku: 'LMP-1', name: 'Desk Lamp' });

      const response = await get(`/api/v1/products/${id}`).expect(200);

      expect(response.body).toMatchObject({
        id,
        sku: 'LMP-1',
        name: 'Desk Lamp',
        category: null,
      });
    });

    it('answers an unknown product with 404 and a malformed id with 400', async () => {
      await get(`/api/v1/products/${uuidv7()}`)
        .expect(404)
        .expect({ statusCode: 404, message: 'Product not found' });
      await get('/api/v1/products/not-a-uuid').expect(400);
    });
  });

  describe('caching in Redis', () => {
    it('answers repeated requests from the cache', async () => {
      const id = await syncProduct(app, { name: 'Desk Lamp' });
      await get('/api/v1/products').expect(200);
      await get(`/api/v1/products/${id}`).expect(200);

      // Changed behind the cache's back (not through the sync), so the cached answers are still served
      await app
        .get(DataSource)
        .query(`UPDATE products SET name = 'Changed in the database'`);

      expect(await names('/api/v1/products')).toEqual(['Desk Lamp']);
      expect((await get(`/api/v1/products/${id}`)).body.name).toBe('Desk Lamp');
    });

    it('is cleared as soon as the catalog changes', async () => {
      const categoryId = await syncCategory(app);
      const id = uuidv7();
      await request(app.getHttpServer())
        .put(`/internal/v1/sync/products/${id}`)
        .set('X-Api-Key', 'test-internal-api-key')
        .send(productMessage({ categoryId, name: 'Desk Lamp', version: 1 }));
      expect(await names('/api/v1/products')).toEqual(['Desk Lamp']);

      await request(app.getHttpServer())
        .put(`/internal/v1/sync/products/${id}`)
        .set('X-Api-Key', 'test-internal-api-key')
        .send(productMessage({ categoryId, name: 'Floor Lamp', version: 2 }))
        .expect(204);

      expect(await names('/api/v1/products')).toEqual(['Floor Lamp']);
    });
  });

  describe('POST and PUT /api/v1/products (admins)', () => {
    const newProduct = {
      categoryId: uuidv7(),
      sku: 'LMP-1',
      name: 'Desk Lamp',
      priceCents: 2990,
    };

    function adminAnswer(
      id: string,
      version: number,
      name = 'Desk Lamp',
    ): object {
      return Object.assign(productMessage({ ...newProduct, name, version }), {
        id,
        updatedAt: new Date().toISOString(),
      });
    }

    async function adminToken(): Promise<string> {
      return tokenFor(app, await createUser(app, { role: UserRole.Admin }));
    }

    it('requires an admin login', async () => {
      const customer = await createUser(app);

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .send(newProduct)
        .expect(401);
      await request(app.getHttpServer())
        .put(`/api/v1/products/${uuidv7()}`)
        .set('Authorization', `Bearer ${await tokenFor(app, customer)}`)
        .send(newProduct)
        .expect(403);
    });

    it('validates the input before calling the admin service', async () => {
      const createProduct = vi.spyOn(
        app.get(AdminCatalogClient),
        'createProduct',
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ sku: '', priceCents: 19.99 })
        .expect(422);

      expect(Object.keys(response.body.errors)).toEqual([
        'categoryId',
        'sku',
        'name',
        'priceCents',
      ]);
      expect(createProduct).not.toHaveBeenCalled();
    });

    it('creates the product in the admin service — readable at once', async () => {
      const id = uuidv7();
      const createProduct = vi
        .spyOn(app.get(AdminCatalogClient), 'createProduct')
        .mockResolvedValue(adminAnswer(id, 1) as never);

      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .set('X-Request-Id', 'trace-create-1')
        .send({ ...newProduct, unknownField: 'dropped' })
        .expect(201);

      expect(createProduct).toHaveBeenCalledWith(newProduct, 'trace-create-1');
      expect(response.body).toMatchObject({
        id,
        sku: 'LMP-1',
        name: 'Desk Lamp',
      });
      await get(`/api/v1/products/${id}`).expect(200);
    });

    it('replaces the product through the admin service', async () => {
      const id = await syncProduct(app, { name: 'Desk Lamp' });
      expect(await names('/api/v1/products')).toEqual(['Desk Lamp']);
      vi.spyOn(app.get(AdminCatalogClient), 'updateProduct').mockResolvedValue(
        adminAnswer(id, 2, 'Floor Lamp') as never,
      );

      await request(app.getHttpServer())
        .put(`/api/v1/products/${id}`)
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send({ ...newProduct, name: 'Floor Lamp' })
        .expect(200);

      expect(await names('/api/v1/products')).toEqual(['Floor Lamp']);
    });

    it("passes the admin service's validation errors on", async () => {
      vi.spyOn(app.get(AdminCatalogClient), 'createProduct').mockRejectedValue(
        new UnprocessableEntityException({
          message: 'Validation failed',
          errors: { sku: ['The sku has already been taken.'] },
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${await adminToken()}`)
        .send(newProduct)
        .expect(422)
        .expect({
          statusCode: 422,
          message: 'Validation failed',
          errors: { sku: ['The sku has already been taken.'] },
        });
    });
  });

  describe('when Redis is down', () => {
    let appWithoutRedis: INestApplication<App>;
    const redisUrl = process.env.CACHE_REDIS_URL;

    beforeAll(async () => {
      process.env.CACHE_REDIS_URL = 'redis://127.0.0.1:1'; // nothing listens there
      appWithoutRedis = await createTestApp();
    });

    afterAll(async () => {
      process.env.CACHE_REDIS_URL = redisUrl;
      await appWithoutRedis.close();
    });

    it('still serves products, straight from the database', async () => {
      await syncProduct(appWithoutRedis, { name: 'Desk Lamp' });

      const response = await request(appWithoutRedis.getHttpServer())
        .get('/api/v1/products')
        .expect(200);

      expect(
        response.body.data.map((product: ProductResponseDto) => product.name),
      ).toEqual(['Desk Lamp']);
    });
  });
});
