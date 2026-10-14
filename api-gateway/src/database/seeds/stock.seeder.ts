import { IsNull, Repository } from 'typeorm';
import { Product } from '../../catalog/product.entity.js';
import { InventoryService } from '../../inventory/inventory.service.js';

/** Units every demo product starts with */
export const DEMO_STOCK = 50;

/**
 * Gives every product that has never been stocked DEMO_STOCK units — a normal stock adjustment, so it's
 * recorded and sent to the admin service like any other. Stocked products are skipped: running it again
 * changes nothing.
 */
export class StockSeeder {
  constructor(
    private readonly products: Repository<Product>,
    private readonly inventory: InventoryService,
  ) {}

  /** Returns the SKUs of the products it stocked. */
  async run(): Promise<string[]> {
    const unstocked = await this.products.find({
      relations: { stockLevel: true },
      where: { stockLevel: { productId: IsNull() } },
      withDeleted: true,
    });

    for (const product of unstocked) {
      await this.inventory.adjust(product.id, DEMO_STOCK);
    }

    return unstocked.map((product) => product.sku);
  }
}
