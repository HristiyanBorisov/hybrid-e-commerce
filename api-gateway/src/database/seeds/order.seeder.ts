import { DataSource, In } from 'typeorm';
import { AdminSync } from '../../admin-sync/admin-sync.js';
import { Product } from '../../catalog/product.entity.js';
import { OrderItem } from '../../orders/order-item.entity.js';
import { OrderStatus } from '../../orders/order-status.enum.js';
import { Order } from '../../orders/order.entity.js';
import { User } from '../../users/user.entity.js';

/** The demo customers created by UsersSeeder */
const DEMO_CUSTOMERS = ['alice@example.com', 'bob@example.com'];
const DAYS = 90;
/** These last days always have orders, so the dashboard shows sales today and orders to ship */
const RECENT_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Demo orders over the last 90 days, so the admin panel's dashboard and sales reports have something to show:
 * 0–2 orders a day (at least one on each of the last days) with 1–3 products each. A fixed random seed gives
 * the same orders every time, dated relative to today. Older orders are delivered, recent ones still shipped
 * or paid, a few cancelled.
 *
 * They're history from before stock was tracked, so they don't take stock: the stock levels still match
 * their movements. Nothing is created when there are orders already.
 */
export class OrderSeeder {
  constructor(
    private readonly dataSource: DataSource,
    private readonly adminSync: AdminSync,
  ) {}

  /** Returns how many orders it created. */
  async run(): Promise<number> {
    const orders = this.dataSource.getRepository(Order);
    const customers = await this.dataSource
      .getRepository(User)
      .find({ where: { email: In(DEMO_CUSTOMERS) }, order: { email: 'ASC' } });
    const products = await this.dataSource
      .getRepository(Product)
      .find({ order: { sku: 'ASC' } });

    if (
      (await orders.exists()) ||
      customers.length === 0 ||
      products.length === 0
    ) {
      return 0;
    }

    const random = seededRandom(20261012);
    const startOfToday = new Date().setUTCHours(0, 0, 0, 0);
    const demoOrders: Order[] = [];

    for (let daysAgo = DAYS; daysAgo >= 0; daysAgo--) {
      const ordersThatDay =
        daysAgo <= RECENT_DAYS
          ? 1 + Math.floor(random() * 2)
          : Math.floor(random() * 3);

      for (let i = 0; i < ordersThatDay; i++) {
        // A random time on that day (UTC), but never in the future
        const placedAt = new Date(
          Math.min(
            Date.now(),
            startOfToday - daysAgo * DAY_MS + random() * DAY_MS,
          ),
        );
        const customer = customers[Math.floor(random() * customers.length)];

        demoOrders.push(
          this.demoOrder(
            customer,
            someProducts(products, random),
            placedAt,
            statusFor(daysAgo, random),
            random,
          ),
        );
      }
    }

    await orders.save(demoOrders);
    await this.adminSync.orders(demoOrders.map((order) => order.id));

    return demoOrders.length;
  }

  private demoOrder(
    customer: User,
    products: Product[],
    placedAt: Date,
    status: OrderStatus,
    random: () => number,
  ): Order {
    const { manager } = this.dataSource;
    const order = manager.create(Order, {
      userId: customer.id,
      status,
      paymentReference: status === OrderStatus.Cancelled ? null : 'mock_demo',
      createdAt: placedAt,
      updatedAt: placedAt,
    });
    order.items = products.map((product) =>
      manager.create(OrderItem, {
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: 1 + Math.floor(random() * 2),
      }),
    );
    order.totalCents = order.items.reduce(
      (total, item) => total + item.unitPriceCents * item.quantity,
      0,
    );

    return order;
  }
}

/** Older orders have been delivered, recent ones are still on their way; now and then one was cancelled. */
function statusFor(daysAgo: number, random: () => number): OrderStatus {
  if (random() < 0.08) return OrderStatus.Cancelled;
  if (daysAgo > 7) return OrderStatus.Delivered;
  if (daysAgo > RECENT_DAYS) return OrderStatus.Shipped;
  return OrderStatus.Paid;
}

/** 1–3 different products, next to each other in the list */
function someProducts(products: Product[], random: () => number): Product[] {
  const count = Math.min(products.length, 1 + Math.floor(random() * 3));
  const first = Math.floor(random() * products.length);

  return Array.from(
    { length: count },
    (_, offset) => products[(first + offset) % products.length],
  );
}

/** Numbers between 0 and 1 that look random but are the same on every run (the "mulberry32" generator). */
function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}
