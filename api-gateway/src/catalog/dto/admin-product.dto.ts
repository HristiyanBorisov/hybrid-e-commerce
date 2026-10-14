import { SyncProductDto } from './sync-product.dto.js';

/**
 * A product as the admin service's internal API answers it: the same format as a sync message, plus the id.
 * Saved into the copy right away, so a product created through this API can be read at once.
 */
export class AdminProductDto extends SyncProductDto {
  id: string;
}
