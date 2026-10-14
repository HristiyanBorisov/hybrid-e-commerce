import { Cache } from '@nestjs/cache-manager';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOperator,
  FindOptionsWhere,
  ILike,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { PaginationMetaDto } from '../common/dto/pagination-meta.dto.js';
import { pageOptions } from '../common/pagination.js';
import { AdminCatalogClient } from './admin-catalog.client.js';
import {
  CATALOG_CACHE_TTL_MS,
  SEARCH_FALLBACK_CACHE_TTL_MS,
} from './catalog-cache.js';
import { CatalogSyncService } from './catalog-sync.service.js';
import { Category } from './category.entity.js';
import { AdminProductDto } from './dto/admin-product.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { ProductListResponseDto } from './dto/product-list-response.dto.js';
import { ProductResponseDto } from './dto/product-response.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductSearch, ProductSearchResult } from './product-search.js';
import { Product } from './product.entity.js';

/**
 * The category with the given slug and all its subcategories, at any depth.
 * UNION (not UNION ALL) skips rows it already found, so even a loop in the copy — possible for a moment
 * while sync messages arrive out of order — can't make the query run forever.
 */
const CATEGORY_TREE_IDS = `
  WITH RECURSIVE tree AS (
    SELECT id FROM categories WHERE slug = $1
    UNION
    SELECT child.id FROM categories child JOIN tree ON child.parent_id = tree.id
  )
  SELECT id FROM tree`;

/**
 * Products for the API. Reads come from this service's copy of the catalog (plus the stock, which this service
 * owns) and are cached in Redis — the cache is cleared whenever the catalog or the stock changes. A search text is
 * answered by Elasticsearch (typos forgiven, best match first). Writes are forwarded to the admin service, which
 * owns the catalog.
 *
 * Returns response DTOs rather than entities: they're what gets cached.
 */
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    private readonly cache: Cache,
    private readonly adminCatalog: AdminCatalogClient,
    private readonly catalogSync: CatalogSyncService,
    private readonly productSearch: ProductSearch,
  ) {}

  /** One page of products: the best matches first when searching, else newest first. Deleted products are left out. */
  list(query: ListProductsQueryDto): Promise<ProductListResponseDto> {
    let searchedWithoutElasticsearch = false;

    return this.cache.wrap(
      listCacheKey(query),
      async () => {
        const searched = query.search
          ? await this.searchPage(query.search, query)
          : null;
        searchedWithoutElasticsearch = Boolean(query.search) && !searched;
        const [products, total] = searched ?? (await this.databasePage(query));

        return {
          data: products.map((product) =>
            ProductResponseDto.fromEntity(product),
          ),
          meta: PaginationMetaDto.of(query, total),
        };
      },
      () =>
        searchedWithoutElasticsearch
          ? SEARCH_FALLBACK_CACHE_TTL_MS
          : CATALOG_CACHE_TTL_MS,
    );
  }

  /** Throws 404 when the product doesn't exist or was deleted. */
  findById(id: string): Promise<ProductResponseDto> {
    return this.cache.wrap(`products:${id}`, async () => {
      const product = await this.products.findOne({
        where: { id },
        relations: { category: true, stockLevel: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return ProductResponseDto.fromEntity(product);
    });
  }

  async create(
    data: CreateProductDto,
    requestId: string,
  ): Promise<ProductResponseDto> {
    return this.saveCopy(
      await this.adminCatalog.createProduct(data, requestId),
    );
  }

  async update(
    id: string,
    data: UpdateProductDto,
    requestId: string,
  ): Promise<ProductResponseDto> {
    return this.saveCopy(
      await this.adminCatalog.updateProduct(id, data, requestId),
    );
  }

  /**
   * Saves the admin service's answer into the copy right away, so the change can be read at once.
   * The sync message that follows carries the same version, so it's ignored.
   */
  private async saveCopy(
    product: AdminProductDto,
  ): Promise<ProductResponseDto> {
    await this.catalogSync.saveProduct(product.id, product);

    return this.findById(product.id);
  }

  /**
   * Elasticsearch finds and ranks the matches; the products themselves (with category and stock) come from the
   * database, in Elasticsearch's order. null when Elasticsearch can't answer — then the database search is used.
   */
  private async searchPage(
    text: string,
    query: ListProductsQueryDto,
  ): Promise<[Product[], number] | null> {
    const categoryIds =
      query.category !== undefined
        ? await this.categoryTreeIds(query.category)
        : undefined;
    const { skip, take } = pageOptions(query);

    let result: ProductSearchResult;
    try {
      result = await this.productSearch.search(
        text,
        {
          categoryIds,
          minPriceCents: query.minPriceCents,
          maxPriceCents: query.maxPriceCents,
        },
        { from: skip, size: take },
      );
    } catch (error) {
      this.logger.warn(
        `Elasticsearch didn't answer — searching the database instead: ${String(error)}`,
      );
      return null;
    }

    const found = await this.products.find({
      where: { id: In(result.ids) },
      relations: { category: true, stockLevel: true },
    });
    const byId = new Map(found.map((product) => [product.id, product]));

    return [result.ids.flatMap((id) => byId.get(id) ?? []), result.total];
  }

  /** Newest first, filtered in the database (a search text matches the name or SKU — the fallback search). */
  private databasePage(
    query: ListProductsQueryDto,
  ): Promise<[Product[], number]> {
    return this.whereConditions(query).then((where) =>
      this.products.findAndCount({
        where,
        relations: { category: true, stockLevel: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        ...pageOptions(query),
      }),
    );
  }

  /** The search matches the name OR the SKU; every other filter applies to both. */
  private async whereConditions(
    query: ListProductsQueryDto,
  ): Promise<FindOptionsWhere<Product>[]> {
    const filters: FindOptionsWhere<Product> = {};

    if (query.category !== undefined) {
      filters.categoryId = In(await this.categoryTreeIds(query.category));
    }

    const price = priceRange(query.minPriceCents, query.maxPriceCents);
    if (price) {
      filters.priceCents = price;
    }

    if (!query.search) {
      return [filters];
    }

    const search = ILike(`%${query.search}%`);
    return [
      { ...filters, name: search },
      { ...filters, sku: search },
    ];
  }

  private async categoryTreeIds(slug: string): Promise<string[]> {
    const rows = await this.categories.query<{ id: string }[]>(
      CATEGORY_TREE_IDS,
      [slug],
    );

    return rows.map((row) => row.id);
  }
}

/** One cache entry per combination of filters and page. */
function listCacheKey(query: ListProductsQueryDto): string {
  const { page, limit, search, category, minPriceCents, maxPriceCents } = query;

  return `products:list:${JSON.stringify([page, limit, search, category, minPriceCents, maxPriceCents])}`;
}

function priceRange(
  min: number | undefined,
  max: number | undefined,
): FindOperator<number> | undefined {
  if (min !== undefined && max !== undefined) return Between(min, max);
  if (min !== undefined) return MoreThanOrEqual(min);
  if (max !== undefined) return LessThanOrEqual(max);
  return undefined;
}
