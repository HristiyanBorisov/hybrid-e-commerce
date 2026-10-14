import { INestApplication } from '@nestjs/common';
import { InventoryService } from '../src/inventory/inventory.service.js';
import { syncProduct } from './catalog.js';

/** Puts a product into the catalog copy with this much stock. Returns its id. */
export async function productInStock(
  app: INestApplication,
  quantity: number,
  overrides: Parameters<typeof syncProduct>[1] = {},
): Promise<string> {
  const id = await syncProduct(app, overrides);
  await app.get(InventoryService).adjust(id, quantity);

  return id;
}
