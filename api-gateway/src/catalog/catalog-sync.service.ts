import { Cache } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity.js';
import { SyncCategoryDto } from './dto/sync-category.dto.js';
import { SyncProductDto } from './dto/sync-product.dto.js';
import { ProductSearch } from './product-search.js';
import { Product } from './product.entity.js';

/**
 * Keeps this service's copy of the catalog up to date with the admin service, which owns it.
 *
 * Every message carries the whole record and its version. A record is saved only when its version is
 * newer than the copy's, in one atomic query — so repeated, retried or out-of-order messages change nothing.
 * Every change clears the product cache and updates the search index.
 */
@Injectable()
export class CatalogSyncService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly cache: Cache,
    private readonly productSearch: ProductSearch,
  ) {}

  async saveCategory(id: string, data: SyncCategoryDto): Promise<void> {
    await this.categories
      .createQueryBuilder('category')
      .insert()
      .values({
        id,
        parentId: data.parentId,
        name: data.name,
        slug: data.slug,
        version: data.version,
      })
      .orUpdate(['parent_id', 'name', 'slug', 'version'], ['id'], {
        overwriteCondition: { where: 'category.version < EXCLUDED.version' },
      })
      .execute();

    await this.cache.clear();
    await this.productSearch.indexCategory(id);
  }

  /** The admin service deletes only empty categories, so no product points here anymore. */
  async removeCategory(id: string): Promise<void> {
    await this.categories.delete({ id });
    await this.cache.clear();
  }

  async saveProduct(id: string, data: SyncProductDto): Promise<void> {
    await this.products
      .createQueryBuilder('product')
      .insert()
      .values({
        id,
        categoryId: data.categoryId,
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        description: data.description,
        priceCents: data.priceCents,
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl,
        version: data.version,
        createdAt: new Date(data.createdAt),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      })
      .orUpdate(
        [
          'category_id',
          'sku',
          'name',
          'slug',
          'description',
          'price_cents',
          'image_url',
          'thumbnail_url',
          'version',
          'created_at',
          'deleted_at',
        ],
        ['id'],
        {
          overwriteCondition: { where: 'product.version < EXCLUDED.version' },
        },
      )
      .execute();

    await this.cache.clear();
    await this.productSearch.indexProduct(id);
  }

  /**
   * The admin service never deletes products for good. If it ever reports one gone, the copy only hides it:
   * orders may still point to it.
   */
  async hideProduct(id: string): Promise<void> {
    await this.products.softDelete({ id });
    await this.cache.clear();
    await this.productSearch.indexProduct(id);
  }
}
