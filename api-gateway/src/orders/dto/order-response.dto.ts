import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Order } from '../order.entity.js';
import { OrderStatus } from '../order-status.enum.js';
import { OrderItemResponseDto } from './order-item-response.dto.js';

/** An order as the API returns it. */
@ObjectType('Order')
export class OrderResponseDto {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  customerId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  /** Sum of the items, in cents */
  @Field(() => Int)
  totalCents: number;

  /** The payment provider's reference, once paid */
  @Field(() => String, { nullable: true })
  paymentReference: string | null;

  /** Goes up with every change — lets a copy of the order tell old data from new */
  @Field(() => Int)
  version: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [OrderItemResponseDto])
  items: OrderItemResponseDto[];

  /** The order must be loaded with its items. */
  static fromEntity(order: Order): OrderResponseDto {
    return {
      id: order.id,
      customerId: order.userId,
      status: order.status,
      totalCents: order.totalCents,
      paymentReference: order.paymentReference,
      version: order.version,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => OrderItemResponseDto.fromEntity(item)),
    };
  }
}
