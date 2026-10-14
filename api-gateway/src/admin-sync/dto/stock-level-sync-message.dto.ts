import { StockLevel } from '../../inventory/stock-level.entity.js';

/** Body of PUT {admin service}/sync/stock-levels/:productId — a product's stock as it is now. */
export class StockLevelSyncMessageDto {
  productId: string;
  quantity: number;
  version: number;

  static fromEntity(stockLevel: StockLevel): StockLevelSyncMessageDto {
    return {
      productId: stockLevel.productId,
      quantity: stockLevel.quantity,
      version: stockLevel.version,
    };
  }
}
