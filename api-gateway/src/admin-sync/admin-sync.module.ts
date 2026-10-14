import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockLevel } from '../inventory/stock-level.entity.js';
import { Order } from '../orders/order.entity.js';
import { AdminSync, ADMIN_SYNC_QUEUE } from './admin-sync.js';
import { AdminSyncClient } from './admin-sync.client.js';
import { AdminSyncProcessor } from './admin-sync.processor.js';

/** Sends what the admin service copies from this service (orders, stock levels) through a queue. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, StockLevel]),
    BullModule.registerQueue({ name: ADMIN_SYNC_QUEUE }),
  ],
  providers: [AdminSync, AdminSyncClient, AdminSyncProcessor],
  exports: [AdminSync],
})
export class AdminSyncModule {}
