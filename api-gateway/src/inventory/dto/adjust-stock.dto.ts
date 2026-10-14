import { IsInt, Max, Min, NotEquals } from 'class-validator';

/** Body of POST /inventory/:productId/adjustments. */
export class AdjustStockDto {
  /**
   * Units to add (positive) or remove (negative)
   * @example 25
   */
  @IsInt()
  @NotEquals(0)
  @Min(-1_000_000)
  @Max(1_000_000)
  quantityChange: number;
}
