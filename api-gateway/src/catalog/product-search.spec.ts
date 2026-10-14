import type { ConfigType } from '@nestjs/config';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Repository } from 'typeorm';
import { elasticsearchConfig } from '../config/elasticsearch.config.js';
import { ProductSearch } from './product-search.js';
import { Product } from './product.entity.js';

describe('ProductSearch', () => {
  const elasticsearch = { search: vi.fn() };
  const productSearch = new ProductSearch(
    elasticsearch as unknown as ElasticsearchService,
    { index: 'products' } as ConfigType<typeof elasticsearchConfig>,
    {} as Repository<Product>,
  );
  const searchFor = (text: string) =>
    productSearch.search(text, {}, { from: 0, size: 20 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the ids of the matches, best first, and their total', async () => {
    elasticsearch.search.mockResolvedValueOnce({
      hits: { total: 2, hits: [{ _id: 'b-id' }, { _id: 'a-id' }] },
    });

    await expect(searchFor('lamp')).resolves.toEqual({
      ids: ['b-id', 'a-id'],
      total: 2,
    });
  });

  it('after a failure, stops asking Elasticsearch for 30 seconds', async () => {
    vi.useFakeTimers();
    elasticsearch.search.mockRejectedValueOnce(
      new Error('getaddrinfo EAI_AGAIN'),
    );

    await expect(searchFor('lamp')).rejects.toThrow('EAI_AGAIN');
    await expect(searchFor('lamp')).rejects.toThrow('not asking again yet');
    expect(elasticsearch.search).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(30_001);
    elasticsearch.search.mockResolvedValueOnce({
      hits: { total: 0, hits: [] },
    });

    await expect(searchFor('lamp')).resolves.toEqual({ ids: [], total: 0 });
    expect(elasticsearch.search).toHaveBeenCalledTimes(2);
  });
});
