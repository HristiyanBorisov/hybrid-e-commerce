import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const ORDER_EMAILS_QUEUE = 'order-emails';

/** Queues the emails about orders, so a slow or unreachable mail server never delays an order. */
@Injectable()
export class OrderEmails {
  constructor(@InjectQueue(ORDER_EMAILS_QUEUE) private readonly queue: Queue) {}

  async sendConfirmation(orderId: string): Promise<void> {
    await this.queue.add('confirmation', { orderId });
  }
}
