import { Order } from '../order.entity.js';
import { OrderStatus } from '../order-status.enum.js';

/** What a customer receives over the WebSocket when one of their orders changes. */
export class OrderUpdateDto {
  id: string;
  status: OrderStatus;
  totalCents: number;
  /** Goes up with every change — a client can ignore an update older than what it shows */
  version: number;
  updatedAt: Date;

  static fromEntity(order: Order): OrderUpdateDto {
    return {
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      version: order.version,
      updatedAt: order.updatedAt,
    };
  }
}
