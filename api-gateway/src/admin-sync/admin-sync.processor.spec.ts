import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { StockLevel } from '../inventory/stock-level.entity.js';
import { OrderItem } from '../orders/order-item.entity.js';
import { Order } from '../orders/order.entity.js';
import { OrderStatus } from '../orders/order-status.enum.js';
import { User } from '../users/user.entity.js';
import { AdminSyncJob } from './admin-sync-job.enum.js';
import { AdminSyncClient } from './admin-sync.client.js';
import { AdminSyncProcessor } from './admin-sync.processor.js';

describe('AdminSyncProcessor', () => {
  const orders = { findOne: vi.fn() };
  const stockLevels = { findOneBy: vi.fn() };
  const client = { putOrder: vi.fn(), putStockLevel: vi.fn() };
  const processor = new AdminSyncProcessor(
    orders as unknown as Repository<Order>,
    stockLevels as unknown as Repository<StockLevel>,
    client as unknown as AdminSyncClient,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function job(
    name: AdminSyncJob,
    id: string,
  ): Job<{ id: string }, void, AdminSyncJob> {
    return { name, data: { id } } as Job<{ id: string }, void, AdminSyncJob>;
  }

  it('sends the order as it is now, with its items and the customer', async () => {
    const order = Object.assign(new Order(), {
      userId: 'alice-id',
      user: Object.assign(new User(), {
        name: 'Alice',
        email: 'alice@example.com',
      }),
      status: OrderStatus.Paid,
      totalCents: 5980,
      version: 2,
      createdAt: new Date('2026-10-12T10:00:00Z'),
      updatedAt: new Date('2026-10-12T10:00:01Z'),
      items: [
        Object.assign(new OrderItem(), {
          productId: 'lamp-id',
          productName: 'Desk Lamp',
          unitPriceCents: 2990,
          quantity: 2,
        }),
      ],
    });
    orders.findOne.mockResolvedValue(order);

    await processor.process(job(AdminSyncJob.Order, order.id));

    expect(orders.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: order.id }, withDeleted: true }),
    );
    expect(client.putOrder).toHaveBeenCalledWith({
      id: order.id,
      customerId: 'alice-id',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      status: 'paid',
      totalCents: 5980,
      version: 2,
      createdAt: '2026-10-12T10:00:00.000Z',
      updatedAt: '2026-10-12T10:00:01.000Z',
      items: [
        {
          id: order.items[0].id,
          productId: 'lamp-id',
          productName: 'Desk Lamp',
          unitPriceCents: 2990,
          quantity: 2,
        },
      ],
    });
  });

  it('sends the stock level as it is now', async () => {
    stockLevels.findOneBy.mockResolvedValue(
      Object.assign(new StockLevel(), {
        productId: 'lamp-id',
        quantity: 7,
        version: 4,
      }),
    );

    await processor.process(job(AdminSyncJob.StockLevel, 'lamp-id'));

    expect(client.putStockLevel).toHaveBeenCalledWith({
      productId: 'lamp-id',
      quantity: 7,
      version: 4,
    });
  });

  it('sends nothing for a record that no longer exists', async () => {
    orders.findOne.mockResolvedValue(null);
    stockLevels.findOneBy.mockResolvedValue(null);

    await processor.process(job(AdminSyncJob.Order, 'gone'));
    await processor.process(job(AdminSyncJob.StockLevel, 'gone'));

    expect(client.putOrder).not.toHaveBeenCalled();
    expect(client.putStockLevel).not.toHaveBeenCalled();
  });

  it('logs a failed attempt (the queue retries it)', () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    processor.onFailed(
      {
        name: 'order',
        data: { id: 'order-1' },
        attemptsMade: 2,
        opts: { attempts: 5 },
      } as Job<{ id: string }>,
      new Error('The admin service answered 503'),
    );

    expect(warn).toHaveBeenCalledWith(
      'Sending order order-1 to the admin service failed (attempt 2 of 5): The admin service answered 503',
    );
  });
});
