import { IsNull, Repository } from 'typeorm';
import { Product } from '../../catalog/product.entity.js';
import { InventoryService } from '../../inventory/inventory.service.js';
import { DEMO_STOCK, StockSeeder } from './stock.seeder.js';

describe('StockSeeder', () => {
  const products = { find: vi.fn() };
  const inventory = { adjust: vi.fn() };
  const seeder = new StockSeeder(
    products as unknown as Repository<Product>,
    inventory as unknown as InventoryService,
  );

  it('stocks every product that has never been stocked, through a normal adjustment', async () => {
    products.find.mockResolvedValue([
      Object.assign(new Product(), { id: 'lamp-id', sku: 'LMP-1' }),
      Object.assign(new Product(), { id: 'rug-id', sku: 'RUG-1' }),
    ]);

    await expect(seeder.run()).resolves.toEqual(['LMP-1', 'RUG-1']);

    expect(products.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stockLevel: { productId: IsNull() } },
      }),
    );
    expect(inventory.adjust).toHaveBeenCalledWith('lamp-id', DEMO_STOCK);
    expect(inventory.adjust).toHaveBeenCalledWith('rug-id', DEMO_STOCK);
  });
});
