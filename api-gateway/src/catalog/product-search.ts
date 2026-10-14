import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { elasticsearchConfig } from '../config/elasticsearch.config.js';
import { Product } from './product.entity.js';

/** After a failed search, Elasticsearch is skipped for this long: an outage costs one slow request, not every one */
const PAUSE_AFTER_FAILURE_MS = 30_000;

/** What a search can be narrowed to (besides the text) */
export interface ProductSearchFilters {
  categoryIds?: string[];
  minPriceCents?: number;
  maxPriceCents?: number;
}

/** One page of matches: product ids, best match first, and how many match in total */
export interface ProductSearchResult {
  ids: string[];
  total: number;
}

/** A product as it's stored in the index */
interface ProductDocument {
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string | null;
  priceCents: number;
  createdAt: Date;
}

/**
 * Full-text product search with Elasticsearch. Typos are forgiven ("pixl" finds "Pixel"), a word can be cut short
 * ("lapt" finds "Laptop"), and results are ranked by relevance across name, category and description. A SKU is a
 * code, not words: it matches exactly or by its beginning ("PHN-00"), never with typos.
 *
 * The index is one more copy of the catalog: the catalog sync keeps it up to date, and it's built from the database
 * when it's missing (on startup) or on request (`make reindex`). Keeping it up to date is best effort — a failure is
 * logged, never passed on — because the database stays the source: if Elasticsearch can't answer, ProductsService
 * searches the database instead.
 */
@Injectable()
export class ProductSearch implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductSearch.name);
  private readonly index: string;
  private pausedUntil = 0;

  constructor(
    private readonly elasticsearch: ElasticsearchService,
    @Inject(elasticsearchConfig.KEY)
    config: ConfigType<typeof elasticsearchConfig>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {
    this.index = config.index;
  }

  /** A new or reset Elasticsearch gets the whole catalog. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      if (!(await this.elasticsearch.indices.exists({ index: this.index }))) {
        await this.reindexAll();
      }
    } catch (error) {
      this.logger.warn(`The search index isn't ready: ${String(error)}`);
    }
  }

  /**
   * Throws when Elasticsearch can't be reached — the caller falls back to the database. After a failure, it throws
   * straight away for the next 30 seconds instead of waiting for Elasticsearch again.
   */
  async search(
    text: string,
    filters: ProductSearchFilters,
    page: { from: number; size: number },
  ): Promise<ProductSearchResult> {
    if (Date.now() < this.pausedUntil) {
      throw new Error(
        'Elasticsearch failed a moment ago — not asking again yet',
      );
    }

    try {
      return await this.query(text, filters, page);
    } catch (error) {
      this.pausedUntil = Date.now() + PAUSE_AFTER_FAILURE_MS;
      throw error;
    }
  }

  private async query(
    text: string,
    filters: ProductSearchFilters,
    page: { from: number; size: number },
  ): Promise<ProductSearchResult> {
    const response = await this.elasticsearch.search({
      index: this.index,
      from: page.from,
      size: page.size,
      _source: false,
      track_total_hits: true,
      rest_total_hits_as_int: true,
      query: {
        bool: {
          // Any of these may match: words with typos forgiven, a word cut short, or the beginning of a SKU
          should: [
            {
              multi_match: {
                query: text,
                fields: ['name^3', 'categoryName', 'description'],
                fuzziness: 'AUTO',
              },
            },
            {
              multi_match: {
                query: text,
                fields: ['name^3', 'categoryName'],
                type: 'bool_prefix',
              },
            },
            {
              prefix: {
                sku: { value: text, case_insensitive: true, boost: 5 },
              },
            },
          ],
          minimum_should_match: 1,
          filter: filterClauses(filters),
        },
      },
      sort: ['_score', { createdAt: 'desc' }],
    });

    return {
      ids: response.hits.hits.map((hit) => hit._id as string),
      total: response.hits.total as number,
    };
  }

  /** Puts the product into the index as it is now — or takes it out when it's gone or deleted. */
  async indexProduct(productId: string): Promise<void> {
    await this.bestEffort(`index product ${productId}`, async () => {
      const product = await this.products.findOne({
        where: { id: productId },
        relations: { category: true },
      });

      if (product) {
        await this.write([product]);
      } else {
        await this.elasticsearch.delete(
          { index: this.index, id: productId, refresh: true },
          { ignore: [404] },
        );
      }
    });
  }

  /** A category's name is part of its products' documents: they're written again when it changes. */
  async indexCategory(categoryId: string): Promise<void> {
    await this.bestEffort(`index category ${categoryId}`, async () => {
      await this.write(
        await this.products.find({
          where: { categoryId },
          relations: { category: true },
        }),
      );
    });
  }

  /** Builds the index again from the database. Returns how many products it holds. */
  async reindexAll(): Promise<number> {
    await this.elasticsearch.indices.delete(
      { index: this.index },
      { ignore: [404] },
    );
    await this.elasticsearch.indices.create({
      index: this.index,
      mappings: {
        properties: {
          sku: { type: 'keyword' },
          name: { type: 'text' },
          description: { type: 'text' },
          categoryId: { type: 'keyword' },
          categoryName: { type: 'text' },
          priceCents: { type: 'integer' },
          createdAt: { type: 'date' },
        },
      },
    });

    const products = await this.products.find({
      relations: { category: true },
    });
    await this.write(products);

    return products.length;
  }

  /** Writes the products, readable by the very next search (catalog changes are rare, so that's affordable). */
  private async write(products: Product[]): Promise<void> {
    if (products.length === 0) {
      return;
    }

    await this.elasticsearch.bulk({
      refresh: true,
      operations: products.flatMap((product) => [
        { index: { _index: this.index, _id: product.id } },
        toDocument(product),
      ]),
    });
  }

  private async bestEffort(
    what: string,
    work: () => Promise<void>,
  ): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.warn(
        `Couldn't ${what} in Elasticsearch (make reindex fixes it): ${String(error)}`,
      );
    }
  }
}

function toDocument(product: Product): ProductDocument {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    priceCents: product.priceCents,
    createdAt: product.createdAt,
  };
}

function filterClauses(filters: ProductSearchFilters): object[] {
  const clauses: object[] = [];

  if (filters.categoryIds) {
    clauses.push({ terms: { categoryId: filters.categoryIds } });
  }
  if (
    filters.minPriceCents !== undefined ||
    filters.maxPriceCents !== undefined
  ) {
    clauses.push({
      range: {
        priceCents: { gte: filters.minPriceCents, lte: filters.maxPriceCents },
      },
    });
  }

  return clauses;
}
