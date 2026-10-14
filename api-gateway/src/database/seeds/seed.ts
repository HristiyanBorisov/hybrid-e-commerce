import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AdminSync } from '../../admin-sync/admin-sync.js';
import { AppModule } from '../../app.module.js';
import { Product } from '../../catalog/product.entity.js';
import { InventoryService } from '../../inventory/inventory.service.js';
import { UsersService } from '../../users/users.service.js';
import { OrderSeeder } from './order.seeder.js';
import { StockSeeder } from './stock.seeder.js';
import { UsersSeeder } from './users.seeder.js';

/**
 * Fills the database with demo data (`make seed`): the demo users, stock for every product, and orders over
 * the last 90 days.
 * Runs after the admin service has sent its catalog. Runs from the compiled build, like the app itself.
 */
async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const users = await new UsersSeeder(app.get(UsersService)).run();
  console.log(
    users.length > 0
      ? `Created demo users: ${users.join(', ')}`
      : 'Demo users already exist — nothing to do.',
  );

  const stocked = await new StockSeeder(
    app.get(DataSource).getRepository(Product),
    app.get(InventoryService),
  ).run();
  console.log(
    stocked.length > 0
      ? `Stocked ${stocked.length} products with demo stock.`
      : 'Every product already has stock — nothing to do.',
  );

  const orders = await new OrderSeeder(
    app.get(DataSource),
    app.get(AdminSync),
  ).run();
  console.log(
    orders > 0
      ? `Created ${orders} demo orders over the last 90 days.`
      : 'There are orders already — nothing to do.',
  );

  await app.close();
}
await seed();
