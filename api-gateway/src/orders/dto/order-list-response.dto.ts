import { Field, ObjectType } from '@nestjs/graphql';
import { PaginationMetaDto } from '../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Order } from '../order.entity.js';
import { OrderResponseDto } from './order-response.dto.js';

/** Response of GET /orders: one page of orders plus where that page sits in the whole list. */
@ObjectType('OrderPage')
export class OrderListResponseDto {
  @Field(() => [OrderResponseDto])
  data: OrderResponseDto[];

  @Field(() => PaginationMetaDto)
  meta: PaginationMetaDto;

  /** The orders must be loaded with their items. */
  static of(
    orders: Order[],
    query: PaginationQueryDto,
    total: number,
  ): OrderListResponseDto {
    return {
      data: orders.map((order) => OrderResponseDto.fromEntity(order)),
      meta: PaginationMetaDto.of(query, total),
    };
  }
}
