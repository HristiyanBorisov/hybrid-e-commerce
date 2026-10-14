import { Cache } from '@nestjs/cache-manager';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AdminSync } from '../admin-sync/admin-sync.js';
import { Product } from '../catalog/product.entity.js';
import { OrderItem } from '../orders/order-item.entity.js';
import { StockLevel } from './stock-level.entity.js';
import { StockMovement } from './stock-movement.entity.js';
import { StockMovementReason } from './stock-movement-reason.enum.js';

/**
 * Stock levels — this service owns them. Every change is recorded as a stock movement.
 *
 * Stock is changed with one conditional UPDATE ("… WHERE quantity + change >= 0"). PostgreSQL locks the row
 * while it runs, so two orders can never both take the last item. The CHECK (quantity >= 0) on the table
 * backs this up.
 */
@Injectable()
export class InventoryService {
  constructor(
    private readonly dataSource: DataSource,
    // Product responses include the stock, so a stock change clears the product cache
    private readonly cache: Cache,
    private readonly adminSync: AdminSync,
  ) {}

  /**
   * Takes an order's items out of stock — all or nothing: 409 if a product hasn't enough.
   * Runs inside the order's transaction, so a failure also undoes the order.
   */
  async takeForOrder(
    manager: EntityManager,
    orderId: string,
    items: OrderItem[],
  ): Promise<void> {
    for (const item of sortedByProduct(items)) {
      if (
        !(await this.changeQuantity(manager, item.productId, -item.quantity))
      ) {
        const left = await this.quantity(manager, item.productId);
        throw new ConflictException(
          `Not enough stock for "${item.productName}": ${left} left`,
        );
      }
    }

    await this.record(
      manager,
      items.map((item) =>
        manager.create(StockMovement, {
          productId: item.productId,
          orderId,
          quantityChange: -item.quantity,
          reason: StockMovementReason.OrderPlaced,
        }),
      ),
    );
  }

  /** Puts a cancelled order's items back into stock. Runs inside the cancellation's transaction. */
  async returnForOrder(
    manager: EntityManager,
    orderId: string,
    items: OrderItem[],
  ): Promise<void> {
    for (const item of sortedByProduct(items)) {
      await this.changeQuantity(manager, item.productId, item.quantity);
    }

    await this.record(
      manager,
      items.map((item) =>
        manager.create(StockMovement, {
          productId: item.productId,
          orderId,
          quantityChange: item.quantity,
          reason: StockMovementReason.OrderCancelled,
        }),
      ),
    );
  }

  /** An admin's manual correction, e.g. a delivery arrived (+) or items were damaged (−). */
  async adjust(productId: string, quantityChange: number): Promise<StockLevel> {
    const stockLevel = await this.dataSource.transaction(async (manager) => {
      const exists = await manager.exists(Product, {
        where: { id: productId },
        withDeleted: true,
      });
      if (!exists) {
        throw new NotFoundException('Product not found');
      }

      // A product's first adjustment creates its stock level
      await manager
        .createQueryBuilder()
        .insert()
        .into(StockLevel)
        .values({ productId, quantity: 0 })
        .orIgnore()
        .execute();

      if (!(await this.changeQuantity(manager, productId, quantityChange))) {
        const inStock = await this.quantity(manager, productId);
        throw new ConflictException(
          `Stock can't go below 0: ${inStock} in stock`,
        );
      }

      await this.record(manager, [
        manager.create(StockMovement, {
          productId,
          orderId: null,
          quantityChange,
          reason: StockMovementReason.Adjustment,
        }),
      ]);

      return manager.findOneByOrFail(StockLevel, { productId });
    });

    await this.stockChanged([productId]);
    return stockLevel;
  }

  /**
   * Call after a stock change is committed: product responses show the new stock at once, and the admin
   * service gets the new levels.
   */
  async stockChanged(productIds: string[]): Promise<void> {
    await this.cache.clear();
    await this.adminSync.stockLevels(productIds);
  }

  /** Adds (+) or removes (−) stock in one statement. Changes nothing and returns false if it would go below 0. */
  private async changeQuantity(
    manager: EntityManager,
    productId: string,
    change: number,
  ): Promise<boolean> {
    const { affected } = await manager
      .createQueryBuilder()
      .update(StockLevel)
      .set({ quantity: () => 'quantity + :change' })
      .where('product_id = :productId AND quantity + :change >= 0', {
        productId,
        change,
      })
      .execute();

    return affected === 1;
  }

  private async quantity(
    manager: EntityManager,
    productId: string,
  ): Promise<number> {
    const stockLevel = await manager.findOneBy(StockLevel, { productId });

    return stockLevel?.quantity ?? 0;
  }

  private async record(
    manager: EntityManager,
    movements: StockMovement[],
  ): Promise<void> {
    await manager.insert(StockMovement, movements);
  }
}

/** Rows are always locked in the same order (by product id), so two orders can't deadlock each other. */
function sortedByProduct(items: OrderItem[]): OrderItem[] {
  return [...items].sort((a, b) => a.productId.localeCompare(b.productId));
}
