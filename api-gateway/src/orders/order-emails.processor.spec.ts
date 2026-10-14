import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Mailer } from '../mail/mailer.js';
import { User } from '../users/user.entity.js';
import { OrderEmails } from './order-emails.js';
import { OrderEmailsProcessor } from './order-emails.processor.js';
import { Order } from './order.entity.js';

describe('Order emails', () => {
  it('queue a confirmation for the order', async () => {
    const queue = { add: vi.fn() };

    await new OrderEmails(queue as unknown as Queue).sendConfirmation(
      'order-1',
    );

    expect(queue.add).toHaveBeenCalledWith('confirmation', {
      orderId: 'order-1',
    });
  });

  describe('OrderEmailsProcessor', () => {
    const orders = { findOne: vi.fn() };
    const mailer = { send: vi.fn() };
    const processor = new OrderEmailsProcessor(
      orders as unknown as Repository<Order>,
      mailer as unknown as Mailer,
    );
    const job = { data: { orderId: 'order-1' } } as Job<{ orderId: string }>;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('emails the confirmation to the customer', async () => {
      orders.findOne.mockResolvedValue(
        Object.assign(new Order(), {
          totalCents: 2990,
          items: [],
          user: Object.assign(new User(), {
            name: 'Alice',
            email: 'alice@example.com',
          }),
        }),
      );

      await processor.process(job);

      expect(mailer.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@example.com' }),
      );
    });

    it('sends nothing for an order that no longer exists', async () => {
      orders.findOne.mockResolvedValue(null);

      await processor.process(job);

      expect(mailer.send).not.toHaveBeenCalled();
    });

    it('logs a failed attempt (the queue retries it)', () => {
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      processor.onFailed(
        {
          data: { orderId: 'order-1' },
          attemptsMade: 1,
          opts: { attempts: 5 },
        } as Job<{ orderId: string }>,
        new Error('connect ECONNREFUSED'),
      );

      expect(warn).toHaveBeenCalledWith(
        'Order email for order-1 failed (attempt 1 of 5): connect ECONNREFUSED',
      );
    });
  });
});
