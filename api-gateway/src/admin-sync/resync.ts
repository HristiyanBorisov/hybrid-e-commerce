import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';
import { StockLevel } from '../inventory/stock-level.entity.js';
import { Order } from '../orders/order.entity.js';
import { AdminSync } from './admin-sync.js';

/**
 * Queues every order and stock level to be sent to the admin service again (`make resync`) — for when its copy
 * has drifted. Safe to run any time: the admin service ignores versions it already has.
 */
async function resync(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const dataSource = app.get(DataSource);

  const orders = await dataSource
    .getRepository(Order)
    .find({ select: { id: true } });
  const stockLevels = await dataSource
    .getRepository(StockLevel)
    .find({ select: { productId: true } });

  await app.get(AdminSync).orders(orders.map((order) => order.id));
  await app
    .get(AdminSync)
    .stockLevels(stockLevels.map((stockLevel) => stockLevel.productId));
  console.log(
    `Queued for the admin service — orders: ${orders.length}, stock levels: ${stockLevels.length}.`,
  );

  await app.close();
}
await resync();
