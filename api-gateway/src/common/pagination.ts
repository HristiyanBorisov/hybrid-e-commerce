import { PaginationQueryDto } from './dto/pagination-query.dto.js';

/** TypeORM `skip`/`take` for the requested page. */
export function pageOptions(query: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}
