import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto.js';

/** Body of POST /orders (and the input of the GraphQL placeOrder). Names and prices come from the catalog, never from the request. */
@InputType('PlaceOrderInput')
export class CreateOrderDto {
  @Field(() => [CreateOrderItemDto])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique((item: CreateOrderItemDto) => item.productId, {
    message: 'each product can be listed only once',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  /**
   * The card token from the payment provider. The mock declines "tok_declined" and approves any other token.
   * @example tok_visa
   */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  paymentToken: string;
}
