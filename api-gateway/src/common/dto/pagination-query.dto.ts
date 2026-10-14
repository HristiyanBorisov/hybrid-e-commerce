import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * ?page=&limit= — shared by every list endpoint (and the GraphQL list queries).
 * Plain data only: a getter here would crash when a client sends a query parameter with the same name.
 */
@ArgsType()
export class PaginationQueryDto {
  /** Page number, starting at 1 */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /** Items per page (max 100) */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
