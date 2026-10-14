import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { pageOptions } from './pagination.js';

describe('pageOptions', () => {
  it('skips the items of the previous pages', () => {
    const query = Object.assign(new PaginationQueryDto(), {
      page: 3,
      limit: 10,
    });

    expect(pageOptions(query)).toEqual({ skip: 20, take: 10 });
  });
});
