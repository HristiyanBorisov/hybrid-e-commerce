import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PaginationQueryDto } from './pagination-query.dto.js';

/** Where a page sits in the whole list — returned as `meta` by every list endpoint. */
@ObjectType('PageInfo')
export class PaginationMetaDto {
  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  /** Number of items across all pages */
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  totalPages: number;

  static of(query: PaginationQueryDto, total: number): PaginationMetaDto {
    return {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }
}
