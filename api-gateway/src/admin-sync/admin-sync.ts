import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AdminSyncJob } from './admin-sync-job.enum.js';

export const ADMIN_SYNC_QUEUE = 'admin-sync';

/**
 * Queues orders and stock levels to be sent to the admin service, which keeps a copy for its order screens
 * and reports. A job carries only the id: it sends the record as it is when the job runs.
 */
@Injectable()
export class AdminSync {
  constructor(@InjectQueue(ADMIN_SYNC_QUEUE) private readonly queue: Queue) {}

  async orders(orderIds: string[]): Promise<void> {
    await this.queue.addBulk(
      orderIds.map((id) => ({ name: AdminSyncJob.Order, data: { id } })),
    );
  }

  async stockLevels(productIds: string[]): Promise<void> {
    await this.queue.addBulk(
      productIds.map((id) => ({ name: AdminSyncJob.StockLevel, data: { id } })),
    );
  }
}
