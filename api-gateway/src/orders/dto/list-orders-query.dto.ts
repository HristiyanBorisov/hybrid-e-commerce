import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { OrderStatus } from '../order-status.enum.js';

/** Query of GET /orders: ?page=&limit=&status= */
@ArgsType()
export class ListOrdersQueryDto extends PaginationQueryDto {
  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
