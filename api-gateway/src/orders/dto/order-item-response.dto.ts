import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { OrderItem } from '../order-item.entity.js';

/** One line of an order, with the name and price it had when the order was placed. */
@ObjectType('OrderItem')
export class OrderItemResponseDto {
  @Field(() => ID)
  productId: string;

  @Field()
  productName: string;

  @Field(() => Int)
  unitPriceCents: number;

  @Field(() => Int)
  quantity: number;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    return {
      productId: item.productId,
      productName: item.productName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
    };
  }
}
