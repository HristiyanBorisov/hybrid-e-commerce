import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';
import { ProductResponseDto } from './product-response.dto.js';

/** Response of GET /products: one page of products plus where that page sits in the whole list. */
@ObjectType('ProductPage')
export class ProductListResponseDto {
  @Field(() => [ProductResponseDto])
  data: ProductResponseDto[];

  @Field(() => PaginationMetaDto)
  meta: PaginationMetaDto;
}
