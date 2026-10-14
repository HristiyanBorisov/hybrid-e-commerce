import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { AdminSync } from '../src/admin-sync/admin-sync.js';
import { OrderEmails } from '../src/orders/order-emails.js';
import { User } from '../src/users/user.entity.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { syncProduct } from './catalog.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { productInStock } from './inventory.js';
import { createUser, tokenFor } from './users.js';

describe('Orders (e2e)', () => {
  let app: INestApplication<App>;
  let customer: User;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    vi.clearAllMocks();
    customer = await createUser(app, {
      name: 'Alice',
      email: 'alice@example.com',
    });
    customerToken = await tokenFor(app, customer);
    adminToken = await tokenFor(
      app,
      await createUser(app, { role: UserRole.Admin }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  function placeOrder(
    items: { productId: string; quantity: number }[],
    paymentToken = 'tok_visa',
    token = customerToken,
  ): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items, paymentToken });
  }

  function changeStatus(
    orderId: string,
    status: string,
    token = adminToken,
  ): request.Test {
    return request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status });
  }

  async function stock(productId: string): Promise<number> {
    const response = await request(app.getHttpServer()).get(
      `/api/v1/products/${productId}`,
    );

    return response.body.stock;
  }

  function movements(
    productId: string,
  ): Promise<{ reason: string; quantity_change: number }[]> {
    return app
      .get(DataSource)
      .query(
        'SELECT reason, quantity_change FROM stock_movements WHERE product_id = $1 ORDER BY created_at, reason',
        [productId],
      );
  }

  describe('POST /api/v1/orders', () => {
    it('places a paid order: stock taken, prices from the catalog, email and sync queued', async () => {
      const lamp = await productInStock(app, 10, {
        name: 'Desk Lamp',
        priceCents: 2990,
      });
      const rug = await productInStock(app, 5, {
        name: 'Rug',
        priceCents: 9900,
      });

      const response = await placeOrder([
        { productId: lamp, quantity: 2 },
        { productId: rug, quantity: 1 },
      ]).expect(201);

      expect(response.body).toMatchObject({
        customerId: customer.id,
        status: 'paid',
        totalCents: 2 * 2990 + 9900,
        paymentReference: expect.stringMatching(/^mock_/),
        items: [
          {
            productId: lamp,
            productName: 'Desk Lamp',
            unitPriceCents: 2990,
            quantity: 2,
          },
          {
            productId: rug,
            productName: 'Rug',
            unitPriceCents: 9900,
            quantity: 1,
          },
        ],
      });
      expect([await stock(lamp), await stock(rug)]).toEqual([8, 4]);
      expect(await movements(lamp)).toEqual([
        { reason: 'adjustment', quantity_change: 10 },
        { reason: 'order_placed', quantity_change: -2 },
      ]);
      expect(app.get(OrderEmails).sendConfirmation).toHaveBeenCalledWith(
        response.body.id,
      );
      expect(app.get(AdminSync).orders).toHaveBeenCalledWith([
        response.body.id,
      ]);
      expect(app.get(AdminSync).stockLevels).toHaveBeenCalledWith([lamp, rug]);
    });

    it("answers 409 when a product hasn't enough stock — and orders nothing", async () => {
      const lamp = await productInStock(app, 10, { name: 'Desk Lamp' });
      const rug = await productInStock(app, 1, { name: 'Rug' });

      await placeOrder([
        { productId: lamp, quantity: 2 },
        { productId: rug, quantity: 2 },
      ])
        .expect(409)
        .expect({
          statusCode: 409,
          message: 'Not enough stock for "Rug": 1 left',
        });

      expect([await stock(lamp), await stock(rug)]).toEqual([10, 1]);
      const [{ count }] = await app
        .get(DataSource)
        .query<{ count: string }[]>('SELECT count(*) FROM orders');
      expect(count).toBe('0');
    });

    it('answers 409 for a product that has never been stocked', async () => {
      const lamp = await syncProduct(app, { name: 'Desk Lamp' });

      await placeOrder([{ productId: lamp, quantity: 1 }])
        .expect(409)
        .expect({
          statusCode: 409,
          message: 'Not enough stock for "Desk Lamp": 0 left',
        });
    });

    it('never sells more than is in stock, even when orders arrive at the same time', async () => {
      const lamp = await productInStock(app, 4);

      // One running server for all of them (otherwise supertest starts one per request)
      await app.listen(0);

      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          placeOrder([{ productId: lamp, quantity: 1 }]),
        ),
      );

      const statuses = responses
        .map((response) => response.status)
        .sort((a, b) => a - b);
      expect(statuses.filter((status) => status === 201)).toHaveLength(4);
      expect(statuses.filter((status) => status === 409)).toHaveLength(6);
      expect(await stock(lamp)).toBe(0);
    });

    it('cancels the order and puts the stock back when the payment is declined (402)', async () => {
      const lamp = await productInStock(app, 3);

      await placeOrder([{ productId: lamp, quantity: 2 }], 'tok_declined')
        .expect(402)
        .expect({ statusCode: 402, message: 'Payment declined' });

      expect(await stock(lamp)).toBe(3);
      const [order] = await app
        .get(DataSource)
        .query<{ status: string }[]>('SELECT status FROM orders');
      expect(order.status).toBe('cancelled');
      expect(app.get(OrderEmails).sendConfirmation).not.toHaveBeenCalled();
    });

    it('answers 422 for products that do not exist or were deleted', async () => {
      const lamp = await productInStock(app, 3);
      const deleted = await syncProduct(app, {
        deletedAt: new Date().toISOString(),
      });

      const response = await placeOrder([
        { productId: lamp, quantity: 1 },
        { productId: uuidv7(), quantity: 1 },
        { productId: deleted, quantity: 1 },
      ]).expect(422);

      expect(response.body.errors).toEqual({
        'items.1.productId': ['Product not found'],
        'items.2.productId': ['Product not found'],
      });
      expect(await stock(lamp)).toBe(3);
    });

    it('validates the request', async () => {
      const lamp = uuidv7();

      const invalid = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [{ productId: 'nope', quantity: 0 }] })
        .expect(422);
      const duplicates = await placeOrder([
        { productId: lamp, quantity: 1 },
        { productId: lamp, quantity: 2 },
      ]).expect(422);
      const empty = await placeOrder([]).expect(422);

      expect(Object.keys(invalid.body.errors)).toEqual([
        'items.0.productId',
        'items.0.quantity',
        'paymentToken',
      ]);
      expect(duplicates.body.errors).toEqual({
        items: ['each product can be listed only once'],
      });
      expect(empty.body.errors).toEqual({
        items: ['items must contain at least 1 elements'],
      });
    });

    it('rejects an order whose total does not fit', async () => {
      const expensive = await productInStock(app, 100, {
        priceCents: 999_999_900,
      });

      await placeOrder([{ productId: expensive, quantity: 3 }])
        .expect(422)
        .expect({
          statusCode: 422,
          message: 'Validation failed',
          errors: { items: ['The order total is too large'] },
        });
    });

    it('requires a login', () => {
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({})
        .expect(401);
    });
  });

  describe('GET /api/v1/orders(/:id)', () => {
    it("lists only the customer's own orders, newest first, filtered by status", async () => {
      const lamp = await productInStock(app, 10);
      const first = (await placeOrder([{ productId: lamp, quantity: 1 }])).body
        .id;
      const second = (await placeOrder([{ productId: lamp, quantity: 2 }])).body
        .id;
      await placeOrder(
        [{ productId: lamp, quantity: 1 }],
        'tok_visa',
        await tokenFor(app, await createUser(app)),
      );
      await changeStatus(first, 'shipped').expect(200);

      const all = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      const shipped = await request(app.getHttpServer())
        .get('/api/v1/orders?status=shipped')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(all.body.data.map((order: { id: string }) => order.id)).toEqual([
        second,
        first,
      ]);
      expect(all.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
      expect(
        shipped.body.data.map((order: { id: string }) => order.id),
      ).toEqual([first]);
    });

    it('shows an order to its customer and to admins, but not to other customers (404)', async () => {
      const lamp = await productInStock(app, 10);
      const orderId = (await placeOrder([{ productId: lamp, quantity: 1 }]))
        .body.id;
      const otherToken = await tokenFor(app, await createUser(app));

      for (const token of [customerToken, adminToken]) {
        await request(app.getHttpServer())
          .get(`/api/v1/orders/${orderId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      }
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404)
        .expect({ statusCode: 404, message: 'Order not found' });
    });
  });

  describe('PATCH /api/v1/orders/:id/status (admins)', () => {
    let lamp: string;
    let orderId: string;

    beforeEach(async () => {
      lamp = await productInStock(app, 10);
      orderId = (await placeOrder([{ productId: lamp, quantity: 3 }])).body.id;
      vi.clearAllMocks();
    });

    it('moves the order on, one step at a time', async () => {
      await changeStatus(orderId, 'shipped').expect(200);
      const response = await changeStatus(orderId, 'delivered').expect(200);

      expect(response.body.status).toBe('delivered');
      expect(app.get(AdminSync).orders).toHaveBeenCalledTimes(2);
    });

    it('refuses moves that are not allowed with 409', async () => {
      await changeStatus(orderId, 'delivered').expect(409).expect({
        statusCode: 409,
        message: "A paid order can't be changed to delivered",
      });
      await changeStatus(orderId, 'pending').expect(409);
    });

    it('puts the stock back when an order is cancelled — once, even if two admins cancel at the same time', async () => {
      const responses = await Promise.all([
        changeStatus(orderId, 'cancelled'),
        changeStatus(orderId, 'cancelled'),
      ]);

      expect(
        responses.map((response) => response.status).sort((a, b) => a - b),
      ).toEqual([200, 409]);
      expect(await stock(lamp)).toBe(10);
      expect(await movements(lamp)).toEqual([
        { reason: 'adjustment', quantity_change: 10 },
        { reason: 'order_placed', quantity_change: -3 },
        { reason: 'order_cancelled', quantity_change: 3 },
      ]);
      expect(app.get(AdminSync).stockLevels).toHaveBeenCalledWith([lamp]);
    });

    it('is for admins only, and answers an unknown order with 404', async () => {
      await changeStatus(orderId, 'shipped', customerToken).expect(403);
      await changeStatus(uuidv7(), 'shipped').expect(404);
      await changeStatus(orderId, 'lost').expect(422);
    });
  });
});
