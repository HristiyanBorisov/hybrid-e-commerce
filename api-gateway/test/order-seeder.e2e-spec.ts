import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AdminSync } from '../src/admin-sync/admin-sync.js';
import { OrderSeeder } from '../src/database/seeds/order.seeder.js';
import { Order } from '../src/orders/order.entity.js';
import { OrderStatus } from '../src/orders/order-status.enum.js';
import { productInStock } from './inventory.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { createUser } from './users.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('OrderSeeder (e2e)', () => {
  let app: INestApplication<App>;
  let seeder: OrderSeeder;

  beforeAll(async () => {
    app = await createTestApp();
    seeder = new OrderSeeder(app.get(DataSource), app.get(AdminSync));
  });

  beforeEach(async () => {
    await resetDatabase(app);
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seededOrders(): Promise<Order[]> {
    return app
      .get(DataSource)
      .getRepository(Order)
      .find({ relations: { items: true }, order: { createdAt: 'ASC' } });
  }

  it("creates the demo customers' orders over the last 90 days, without touching the stock", async () => {
    await createUser(app, { email: 'alice@example.com' });
    await createUser(app, { email: 'bob@example.com' });
    const lamp = await productInStock(app, 50, {
      sku: 'LMP-1',
      priceCents: 2990,
    });
    await productInStock(app, 50, { sku: 'RUG-1', priceCents: 9900 });

    const created = await seeder.run();
    const orders = await seededOrders();

    expect(created).toBeGreaterThan(60);
    expect(orders).toHaveLength(created);
    expect(Date.now() - orders[0].createdAt.getTime()).toBeLessThan(
      91 * DAY_MS,
    );
    expect(orders.at(-1)!.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    for (const order of orders) {
      expect(order.totalCents).toBe(
        order.items.reduce(
          (total, item) => total + item.unitPriceCents * item.quantity,
          0,
        ),
      );
    }

    // Older orders are delivered; the last days have paid orders waiting to ship
    const ageInDays = (order: Order): number =>
      (Date.now() - order.createdAt.getTime()) / DAY_MS;
    expect(
      orders
        .filter((order) => ageInDays(order) > 8)
        .every((order) =>
          [OrderStatus.Delivered, OrderStatus.Cancelled].includes(order.status),
        ),
    ).toBe(true);
    expect(orders.some((order) => order.status === OrderStatus.Paid)).toBe(
      true,
    );

    const [{ quantity }] = await app
      .get(DataSource)
      .query<{ quantity: number }[]>(
        'SELECT quantity FROM stock_levels WHERE product_id = $1',
        [lamp],
      );
    expect(quantity).toBe(50);
    expect(app.get(AdminSync).orders).toHaveBeenCalledWith(
      orders.map((order) => order.id).sort(),
    );
  });

  it('creates nothing when there are orders already, or nobody to order', async () => {
    expect(await seeder.run()).toBe(0); // no demo customers, no products

    await createUser(app, { email: 'alice@example.com' });
    await productInStock(app, 5);
    expect(await seeder.run()).toBeGreaterThan(0);
    expect(await seeder.run()).toBe(0);
  });
});
