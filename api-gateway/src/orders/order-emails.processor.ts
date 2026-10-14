import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Mailer } from '../mail/mailer.js';
import { orderConfirmationEmail } from './order-confirmation.email.js';
import { ORDER_EMAILS_QUEUE } from './order-emails.js';
import { Order } from './order.entity.js';

/** Sends the queued order emails. A failure (mail server down) is retried by the queue. */
@Processor(ORDER_EMAILS_QUEUE)
export class OrderEmailsProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderEmailsProcessor.name);

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly mailer: Mailer,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>): Promise<void> {
    const order = await this.orders.findOne({
      where: { id: job.data.orderId },
      relations: { items: true, user: true },
      order: { items: { id: 'ASC' } },
      withDeleted: true,
    });

    if (order) {
      await this.mailer.send(orderConfirmationEmail(order));
    }
  }

  /** The queue retries the job; this only makes the failure visible in the logs. */
  @OnWorkerEvent('failed')
  onFailed(job: Job<{ orderId: string }>, error: Error): void {
    this.logger.warn(
      `Order email for ${job.data.orderId} failed (attempt ${job.attemptsMade} of ${job.opts.attempts}): ${error.message}`,
    );
  }
}
