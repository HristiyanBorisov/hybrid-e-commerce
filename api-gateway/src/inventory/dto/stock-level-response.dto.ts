import { StockLevel } from '../stock-level.entity.js';

/** A product's stock as the API returns it. */
export class StockLevelResponseDto {
  productId: string;
  quantity: number;
  /** Goes up with every change — lets a copy of the stock level tell old data from new */
  version: number;

  static fromEntity(stockLevel: StockLevel): StockLevelResponseDto {
    return {
      productId: stockLevel.productId,
      quantity: stockLevel.quantity,
      version: stockLevel.version,
    };
  }
}
