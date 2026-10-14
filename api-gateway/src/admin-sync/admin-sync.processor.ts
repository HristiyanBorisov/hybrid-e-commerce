import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { StockLevel } from '../inventory/stock-level.entity.js';
import { Order } from '../orders/order.entity.js';
import { AdminSyncJob } from './admin-sync-job.enum.js';
import { ADMIN_SYNC_QUEUE } from './admin-sync.js';
import { AdminSyncClient } from './admin-sync.client.js';
import { OrderSyncMessageDto } from './dto/order-sync-message.dto.js';
import { StockLevelSyncMessageDto } from './dto/stock-level-sync-message.dto.js';

/** Runs the admin-sync jobs: loads the record as it is now and sends it to the admin service. */
@Processor(ADMIN_SYNC_QUEUE)
export class AdminSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(AdminSyncProcessor.name);

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(StockLevel)
    private readonly stockLevels: Repository<StockLevel>,
    private readonly client: AdminSyncClient,
  ) {
    super();
  }

  async process(job: Job<{ id: string }, void, AdminSyncJob>): Promise<void> {
    switch (job.name) {
      case AdminSyncJob.Order:
        return this.sendOrder(job.data.id);
      case AdminSyncJob.StockLevel:
        return this.sendStockLevel(job.data.id);
    }
  }

  /** The queue retries the job; this only makes the failure visible in the logs. */
  @OnWorkerEvent('failed')
  onFailed(job: Job<{ id: string }>, error: Error): void {
    this.logger.warn(
      `Sending ${job.name} ${job.data.id} to the admin service failed (attempt ${job.attemptsMade} of ${job.opts.attempts}): ${error.message}`,
    );
  }

  private async sendOrder(id: string): Promise<void> {
    const order = await this.orders.findOne({
      where: { id },
      relations: { items: true, user: true },
      // The customer may have been deleted since — the order still belongs to them
      withDeleted: true,
    });

    if (order) {
      await this.client.putOrder(OrderSyncMessageDto.fromEntity(order));
    }
  }

  private async sendStockLevel(productId: string): Promise<void> {
    const stockLevel = await this.stockLevels.findOneBy({ productId });

    if (stockLevel) {
      await this.client.putStockLevel(
        StockLevelSyncMessageDto.fromEntity(stockLevel),
      );
    }
  }
}
