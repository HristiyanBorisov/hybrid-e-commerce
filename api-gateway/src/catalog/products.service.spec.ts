import { Cache } from '@nestjs/cache-manager';
import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Between,
  ILike,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { StockLevel } from '../inventory/stock-level.entity.js';
import { ProductSearch } from './product-search.js';
import { AdminCatalogClient } from './admin-catalog.client.js';
import {
  CATALOG_CACHE_TTL_MS,
  SEARCH_FALLBACK_CACHE_TTL_MS,
} from './catalog-cache.js';
import { CatalogSyncService } from './catalog-sync.service.js';
import { Category } from './category.entity.js';
import { ListProductsQueryDto } from './dto/list-products-query.dto.js';
import { Product } from './product.entity.js';
import { ProductsService } from './products.service.js';

const PRODUCT_ID = '0199e3a0-0000-7000-8000-000000000010';

function lamp(overrides: Partial<Product> = {}): Product {
  return Object.assign(new Product(), {
    id: PRODUCT_ID,
    categoryId: 'lighting-id',
    category: Object.assign(new Category(), {
      id: 'lighting-id',
      name: 'Lighting',
      slug: 'lighting',
    }),
    sku: 'LMP-1',
    name: 'Desk Lamp',
    slug: 'desk-lamp',
    description: null,
    priceCents: 2990,
    imageUrl: null,
    thumbnailUrl: null,
    stockLevel: Object.assign(new StockLevel(), { quantity: 7 }),
    ...overrides,
  });
}

function listQuery(
  values: Partial<ListProductsQueryDto> = {},
): ListProductsQueryDto {
  return Object.assign(new ListProductsQueryDto(), values);
}

describe('ProductsService', () => {
  const products = { findAndCount: vi.fn(), findOne: vi.fn(), find: vi.fn() };
  const categories = { query: vi.fn() };
  // A cache that always misses: every call loads the data
  const cache = {
    wrap: vi.fn(
      (_key: string, load: () => Promise<unknown>, _cacheTime?: () => number) =>
        load(),
    ),
  };
  const adminCatalog = { createProduct: vi.fn(), updateProduct: vi.fn() };
  const catalogSync = { saveProduct: vi.fn() };
  const productSearch = { search: vi.fn() };

  const service = new ProductsService(
    products as unknown as Repository<Product>,
    categories as unknown as Repository<Category>,
    cache as unknown as Cache,
    adminCatalog as unknown as AdminCatalogClient,
    catalogSync as unknown as CatalogSyncService,
    productSearch as unknown as ProductSearch,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    products.findAndCount.mockResolvedValue([[lamp()], 21]);
    products.findOne.mockResolvedValue(lamp());
    productSearch.search.mockResolvedValue({ ids: [], total: 0 });
    products.find.mockResolvedValue([]);
  });

  function listWhere(): unknown {
    return products.findAndCount.mock.calls[0][0].where;
  }

  describe('list', () => {
    it('returns one page of products, newest first, with pagination info', async () => {
      const result = await service.list(listQuery({ page: 2, limit: 20 }));

      expect(products.findAndCount).toHaveBeenCalledWith({
        where: [{}],
        relations: { category: true, stockLevel: true },
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 20,
        take: 20,
      });
      expect(result).toEqual({
        data: [
          {
            id: PRODUCT_ID,
            sku: 'LMP-1',
            name: 'Desk Lamp',
            slug: 'desk-lamp',
            description: null,
            priceCents: 2990,
            imageUrl: null,
            thumbnailUrl: null,
            stock: 7,
            category: { id: 'lighting-id', name: 'Lighting', slug: 'lighting' },
          },
        ],
        meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
      });
    });

    it('answers a search text with Elasticsearch: its matches, in its order, with its total', async () => {
      categories.query.mockResolvedValue([{ id: 'lighting-id' }]);
      productSearch.search.mockResolvedValue({
        ids: ['b-id', 'a-id'],
        total: 7,
      });
      products.find.mockResolvedValue([
        lamp({ id: 'a-id', name: 'A' }),
        lamp({ id: 'b-id', name: 'B' }),
      ]);

      const result = await service.list(
        listQuery({
          search: 'lamp',
          category: 'lighting',
          minPriceCents: 1000,
          page: 2,
          limit: 5,
        }),
      );

      expect(productSearch.search).toHaveBeenCalledWith(
        'lamp',
        {
          categoryIds: ['lighting-id'],
          minPriceCents: 1000,
          maxPriceCents: undefined,
        },
        { from: 5, size: 5 },
      );
      expect(products.find).toHaveBeenCalledWith({
        where: { id: In(['b-id', 'a-id']) },
        relations: { category: true, stockLevel: true },
      });
      expect(result.data.map((product) => product.name)).toEqual(['B', 'A']);
      expect(result.meta).toEqual({
        page: 2,
        limit: 5,
        total: 7,
        totalPages: 2,
      });
      expect(products.findAndCount).not.toHaveBeenCalled();
      expect((cache.wrap.mock.calls[0][2] as () => number)()).toBe(
        CATALOG_CACHE_TTL_MS,
      );
    });

    it("searches the name OR the SKU in the database when Elasticsearch can't answer", async () => {
      productSearch.search.mockRejectedValue(new Error('connect ECONNREFUSED'));
      const warn = vi
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      await service.list(
        listQuery({ search: 'lamp', minPriceCents: 1000, maxPriceCents: 5000 }),
      );

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('searching the database instead'),
      );
      // A stand-in result is cached only briefly; a real search for the normal time
      const cacheTime = cache.wrap.mock.calls[0][2] as () => number;
      expect(cacheTime()).toBe(SEARCH_FALLBACK_CACHE_TTL_MS);
      expect(listWhere()).toEqual([
        { priceCents: Between(1000, 5000), name: ILike('%lamp%') },
        { priceCents: Between(1000, 5000), sku: ILike('%lamp%') },
      ]);
    });

    it('filters by a lowest or a highest price on its own', async () => {
      await service.list(listQuery({ minPriceCents: 1000 }));
      await service.list(listQuery({ maxPriceCents: 0 }));

      expect(products.findAndCount.mock.calls[0][0].where).toEqual([
        { priceCents: MoreThanOrEqual(1000) },
      ]);
      expect(products.findAndCount.mock.calls[1][0].where).toEqual([
        { priceCents: LessThanOrEqual(0) },
      ]);
    });

    it('includes the subcategories when filtering by category', async () => {
      categories.query.mockResolvedValue([
        { id: 'home-id' },
        { id: 'lighting-id' },
      ]);

      await service.list(listQuery({ category: 'home' }));

      expect(categories.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH RECURSIVE'),
        ['home'],
      );
      expect(listWhere()).toEqual([
        { categoryId: In(['home-id', 'lighting-id']) },
      ]);
    });

    it('caches every combination of filters and page separately', async () => {
      await service.list(listQuery({ page: 1, limit: 20, search: 'lamp' }));
      await service.list(listQuery({ page: 2, limit: 20, search: 'lamp' }));
      await service.list(listQuery({ page: 1, limit: 20, search: 'lamp' }));

      const [first, second, third] = cache.wrap.mock.calls.map(([key]) => key);
      expect(first).not.toBe(second);
      expect(third).toBe(first);
    });
  });

  describe('findById', () => {
    it('returns the product with its category, cached per product', async () => {
      const product = await service.findById(PRODUCT_ID);

      expect(products.findOne).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        relations: { category: true, stockLevel: true },
      });
      expect(product).toMatchObject({
        sku: 'LMP-1',
        category: { slug: 'lighting' },
      });
      expect(cache.wrap).toHaveBeenCalledWith(
        `products:${PRODUCT_ID}`,
        expect.any(Function),
      );
    });

    it("shows no category while the product's category hasn't been synced yet, and 0 stock before it's stocked", async () => {
      products.findOne.mockResolvedValue(
        lamp({ category: null, stockLevel: null }),
      );

      await expect(service.findById(PRODUCT_ID)).resolves.toMatchObject({
        category: null,
        stock: 0,
      });
    });

    it("answers 404 when the product doesn't exist or was deleted", async () => {
      products.findOne.mockResolvedValue(null);

      await expect(service.findById(PRODUCT_ID)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });
  });

  describe('create and update', () => {
    const data = {
      categoryId: 'lighting-id',
      sku: 'LMP-1',
      name: 'Desk Lamp',
      priceCents: 2990,
    };
    const saved = { ...data, id: PRODUCT_ID, version: 1 };

    it('are saved by the admin service; its answer goes into the copy at once and is returned', async () => {
      adminCatalog.createProduct.mockResolvedValue(saved);

      const product = await service.create(data, 'trace-123');

      expect(adminCatalog.createProduct).toHaveBeenCalledWith(
        data,
        'trace-123',
      );
      expect(catalogSync.saveProduct).toHaveBeenCalledWith(PRODUCT_ID, saved);
      expect(product).toMatchObject({ id: PRODUCT_ID, name: 'Desk Lamp' });
    });

    it('sends an update for the given product', async () => {
      adminCatalog.updateProduct.mockResolvedValue({ ...saved, version: 2 });

      await service.update(PRODUCT_ID, data, 'trace-123');

      expect(adminCatalog.updateProduct).toHaveBeenCalledWith(
        PRODUCT_ID,
        data,
        'trace-123',
      );
      expect(catalogSync.saveProduct).toHaveBeenCalledWith(PRODUCT_ID, {
        ...saved,
        version: 2,
      });
    });

    it('changes nothing in the copy when the admin service refuses', async () => {
      adminCatalog.createProduct.mockRejectedValue(
        new ServiceUnavailableException(),
      );

      await expect(service.create(data, 'trace-123')).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(catalogSync.saveProduct).not.toHaveBeenCalled();
    });
  });
});
