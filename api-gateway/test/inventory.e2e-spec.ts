import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { v7 as uuidv7 } from 'uuid';
import { AdminSync } from '../src/admin-sync/admin-sync.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { syncProduct } from './catalog.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { createUser, tokenFor } from './users.js';

describe('Inventory (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    vi.clearAllMocks();
    adminToken = await tokenFor(
      app,
      await createUser(app, { role: UserRole.Admin }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  function adjust(
    productId: string,
    quantityChange: unknown,
    token = adminToken,
  ): request.Test {
    return request(app.getHttpServer())
      .post(`/api/v1/inventory/${productId}/adjustments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantityChange });
  }

  it('adds and removes stock; product responses show it at once', async () => {
    const lamp = await syncProduct(app);
    await request(app.getHttpServer())
      .get(`/api/v1/products/${lamp}`)
      .expect(200); // cached with stock 0

    await adjust(lamp, 25)
      .expect(201)
      .expect({ productId: lamp, quantity: 25, version: 2 });
    await adjust(lamp, -5)
      .expect(201)
      .expect({ productId: lamp, quantity: 20, version: 3 });

    const product = await request(app.getHttpServer()).get(
      `/api/v1/products/${lamp}`,
    );
    expect(product.body.stock).toBe(20);
    expect(app.get(AdminSync).stockLevels).toHaveBeenLastCalledWith([lamp]);
  });

  it("can't take the stock below zero (409)", async () => {
    const lamp = await syncProduct(app);
    await adjust(lamp, 3);

    await adjust(lamp, -4).expect(409).expect({
      statusCode: 409,
      message: "Stock can't go below 0: 3 in stock",
    });
  });

  it('works for soft-deleted products too, but not for unknown ones (404)', async () => {
    const deleted = await syncProduct(app, {
      deletedAt: new Date().toISOString(),
    });

    await adjust(deleted, 1).expect(201);
    await adjust(uuidv7(), 1)
      .expect(404)
      .expect({ statusCode: 404, message: 'Product not found' });
  });

  it('validates the change and is for admins only', async () => {
    const lamp = await syncProduct(app);

    await adjust(lamp, 0).expect(422);
    await adjust(lamp, 1.5).expect(422);
    await adjust(lamp, 1, await tokenFor(app, await createUser(app))).expect(
      403,
    );
  });
});
