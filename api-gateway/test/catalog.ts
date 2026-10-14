import { INestApplication } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { CatalogSyncService } from '../src/catalog/catalog-sync.service.js';
import { SyncCategoryDto } from '../src/catalog/dto/sync-category.dto.js';
import { SyncProductDto } from '../src/catalog/dto/sync-product.dto.js';

/** The key the admin service sends to the internal API in the e2e tests (set in vitest.config.ts). */
export const TEST_API_KEY = 'test-internal-api-key';

/** A category sync message, as the admin service sends it. */
export function categoryMessage(
  overrides: Partial<SyncCategoryDto> = {},
): SyncCategoryDto {
  return {
    parentId: null,
    name: 'Lighting',
    slug: 'lighting',
    version: 1,
    ...overrides,
  };
}

/** A product sync message, as the admin service sends it. */
export function productMessage(
  overrides: Partial<SyncProductDto> = {},
): SyncProductDto {
  return {
    categoryId: uuidv7(),
    sku: `SKU-${uuidv7().slice(-8)}`,
    name: 'Desk Lamp',
    slug: `desk-lamp-${uuidv7().slice(-8)}`,
    description: null,
    priceCents: 2990,
    imageUrl: null,
    thumbnailUrl: null,
    version: 1,
    createdAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

/** Puts a category into the catalog copy, as a sync message would. Returns its id. */
export async function syncCategory(
  app: INestApplication,
  overrides: Partial<SyncCategoryDto> = {},
): Promise<string> {
  const id = uuidv7();
  await app
    .get(CatalogSyncService)
    .saveCategory(id, categoryMessage(overrides));

  return id;
}

/** Puts a product into the catalog copy, as a sync message would. Returns its id. */
export async function syncProduct(
  app: INestApplication,
  overrides: Partial<SyncProductDto> = {},
): Promise<string> {
  const id = uuidv7();
  await app.get(CatalogSyncService).saveProduct(id, productMessage(overrides));

  return id;
}
