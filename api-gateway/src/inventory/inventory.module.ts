import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSyncModule } from '../admin-sync/admin-sync.module.js';
import { CatalogModule } from '../catalog/catalog.module.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { StockLevel } from './stock-level.entity.js';
import { StockMovement } from './stock-movement.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockLevel, StockMovement]),
    // For the product cache: product responses include the stock
    CatalogModule,
    AdminSyncModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
