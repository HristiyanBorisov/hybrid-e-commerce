import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

/** Query of GET /products: ?page=&limit=&search=&category=&minPriceCents=&maxPriceCents= (and the GraphQL query's arguments) */
@ArgsType()
export class ListProductsQueryDto extends PaginationQueryDto {
  /** Part of the name or SKU (case-insensitive) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Category slug, e.g. "electronics" — products in its subcategories are included */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  category?: string;

  /** Lowest price in cents (1999 = 19.99) */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCents?: number;

  /** Highest price in cents */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;
}
