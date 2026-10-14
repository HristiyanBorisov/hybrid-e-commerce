import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsUUID, Max, Min } from 'class-validator';

/** One line of POST /orders. */
@InputType('OrderItemInput')
export class CreateOrderItemDto {
  @Field(() => ID)
  @IsUUID()
  productId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}
