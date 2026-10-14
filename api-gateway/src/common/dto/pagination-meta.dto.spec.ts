import { PaginationMetaDto } from './pagination-meta.dto.js';
import { PaginationQueryDto } from './pagination-query.dto.js';

describe('PaginationMetaDto', () => {
  function query(page: number, limit: number): PaginationQueryDto {
    return Object.assign(new PaginationQueryDto(), { page, limit });
  }

  it('describes where the page sits in the whole list', () => {
    expect(PaginationMetaDto.of(query(2, 20), 45)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('has no pages for an empty list', () => {
    expect(PaginationMetaDto.of(query(1, 20), 0)).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it('starts at page 1 with 20 items when the query has no page or limit', () => {
    const defaults = new PaginationQueryDto();

    expect({ page: defaults.page, limit: defaults.limit }).toEqual({
      page: 1,
      limit: 20,
    });
  });
});
