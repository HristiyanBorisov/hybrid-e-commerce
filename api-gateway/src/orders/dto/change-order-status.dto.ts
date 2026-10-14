import { IsEnum } from 'class-validator';
import { OrderStatus } from '../order-status.enum.js';

/** Body of PATCH /orders/:id/status. */
export class ChangeOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
