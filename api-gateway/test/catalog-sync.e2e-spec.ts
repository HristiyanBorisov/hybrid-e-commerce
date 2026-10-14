import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { UserRole } from '../src/users/user-role.enum.js';
import {
  categoryMessage,
  productMessage,
  syncCategory,
  TEST_API_KEY,
} from './catalog.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { createUser, tokenFor } from './users.js';

describe('Catalog sync from the admin service (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function send(
    method: 'put' | 'delete',
    url: string,
    body: object = {},
  ): request.Test {
    return request(app.getHttpServer())
      [method](url)
      .set('X-Api-Key', TEST_API_KEY)
      .send(body);
  }

  function row<T>(table: string, id: string): Promise<T | undefined> {
    return app
      .get(DataSource)
      .query<T[]>(`SELECT * FROM ${table} WHERE id = $1`, [id])
      .then((rows) => rows[0]);
  }

  describe('access', () => {
    it('requires the shared API key — a user login is not enough', async () => {
      const id = uuidv7();
      const admin = await createUser(app, { role: UserRole.Admin });

      await request(app.getHttpServer())
        .put(`/internal/v1/sync/categories/${id}`)
        .send(categoryMessage())
        .expect(401)
        .expect({ statusCode: 401, message: 'Invalid API key' });
      await request(app.getHttpServer())
        .put(`/internal/v1/sync/categories/${id}`)
        .set('X-Api-Key', 'wrong-key')
        .set('Authorization', `Bearer ${await tokenFor(app, admin)}`)
        .send(categoryMessage())
        .expect(401);
    });

    it('is not part of the public /api routes', async () => {
      const id = uuidv7();

      await send('put', `/api/internal/v1/sync/categories/${id}`).expect(404);
      await send('put', `/api/v1/internal/v1/sync/categories/${id}`).expect(
        404,
      );
    });
  });

  describe('categories', () => {
    it('saves a new category and applies a newer version', async () => {
      const id = uuidv7();
      const parentId = uuidv7();

      await send(
        'put',
        `/internal/v1/sync/categories/${id}`,
        categoryMessage({ name: 'Lamps', slug: 'lamps' }),
      ).expect(204);
      await send(
        'put',
        `/internal/v1/sync/categories/${id}`,
        categoryMessage({
          parentId,
          name: 'Desk Lamps',
          slug: 'desk-lamps',
          version: 2,
        }),
      ).expect(204);

      expect(await row('categories', id)).toEqual({
        id,
        parent_id: parentId,
        name: 'Desk Lamps',
        slug: 'desk-lamps',
        version: 2,
      });
    });

    it('ignores a repeated or older version, e.g. a late retry', async () => {
      const id = uuidv7();
      const url = `/internal/v1/sync/categories/${id}`;

      await send('put', url, categoryMessage({ name: 'Newest', version: 3 }));
      await send(
        'put',
        url,
        categoryMessage({ name: 'Same version', version: 3 }),
      ).expect(204);
      await send(
        'put',
        url,
        categoryMessage({ name: 'Older', version: 2 }),
      ).expect(204);

      expect(await row('categories', id)).toMatchObject({
        name: 'Newest',
        version: 3,
      });
    });

    it('removes a deleted category; repeating the call changes nothing', async () => {
      const id = await syncCategory(app);

      await send('delete', `/internal/v1/sync/categories/${id}`).expect(204);
      await send('delete', `/internal/v1/sync/categories/${id}`).expect(204);

      expect(await row('categories', id)).toBeUndefined();
    });

    it('rejects an invalid message with 422 and a malformed id with 400', async () => {
      const response = await send(
        'put',
        `/internal/v1/sync/categories/${uuidv7()}`,
        { parentId: 'nope', version: 0 },
      ).expect(422);

      expect(Object.keys(response.body.errors)).toEqual([
        'parentId',
        'name',
        'slug',
        'version',
      ]);
      await send(
        'put',
        '/internal/v1/sync/categories/not-a-uuid',
        categoryMessage(),
      ).expect(400);
    });
  });

  describe('products', () => {
    it('saves the product as sent, dropping the fields the copy does not keep', async () => {
      const id = uuidv7();
      const message = productMessage({
        sku: 'LMP-1',
        priceCents: 2990,
        imageUrl: 'http://localhost:8080/storage/products/lamp.jpg',
        createdAt: '2026-10-12T09:30:00+00:00',
      });

      await send(
        'put',
        `/internal/v1/sync/products/${id}`,
        Object.assign(message, { id, updatedAt: '2026-10-12T09:31:00+00:00' }),
      ).expect(204);

      expect(await row('products', id)).toMatchObject({
        id,
        sku: 'LMP-1',
        price_cents: 2990,
        image_url: 'http://localhost:8080/storage/products/lamp.jpg',
        version: 1,
        created_at: new Date('2026-10-12T09:30:00Z'),
        deleted_at: null,
      });
    });

    it('ignores an older version', async () => {
      const id = uuidv7();
      const url = `/internal/v1/sync/products/${id}`;

      await send('put', url, productMessage({ name: 'Newest', version: 2 }));
      await send('put', url, productMessage({ name: 'Older', version: 1 }));

      expect(await row('products', id)).toMatchObject({ name: 'Newest' });
    });

    it('accepts a product before its category has arrived', async () => {
      await send(
        'put',
        `/internal/v1/sync/products/${uuidv7()}`,
        productMessage({ categoryId: uuidv7() }),
      ).expect(204);
    });

    it('hides a soft-deleted product from the API, and shows it again once restored', async () => {
      const id = uuidv7();
      const url = `/internal/v1/sync/products/${id}`;

      await send('put', url, productMessage({ version: 1 }));
      await send(
        'put',
        url,
        productMessage({ version: 2, deletedAt: '2026-10-12T10:00:00+00:00' }),
      );
      await request(app.getHttpServer())
        .get(`/api/v1/products/${id}`)
        .expect(404);

      await send('put', url, productMessage({ version: 3, deletedAt: null }));
      await request(app.getHttpServer())
        .get(`/api/v1/products/${id}`)
        .expect(200);
    });

    it('only hides a product reported as gone: orders may still point to it', async () => {
      const id = uuidv7();
      await send('put', `/internal/v1/sync/products/${id}`, productMessage());

      await send('delete', `/internal/v1/sync/products/${id}`).expect(204);

      expect(await row('products', id)).toMatchObject({
        deleted_at: expect.any(Date),
      });
      await request(app.getHttpServer())
        .get(`/api/v1/products/${id}`)
        .expect(404);
    });

    it('rejects an invalid message with 422', async () => {
      const response = await send(
        'put',
        `/internal/v1/sync/products/${uuidv7()}`,
        productMessage({ priceCents: -1, createdAt: 'yesterday' }),
      ).expect(422);

      expect(Object.keys(response.body.errors)).toEqual([
        'priceCents',
        'createdAt',
      ]);
    });
  });
});
