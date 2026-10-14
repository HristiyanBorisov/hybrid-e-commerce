import { Order } from '../../orders/order.entity.js';
import { OrderStatus } from '../../orders/order-status.enum.js';
import { OrderItemSyncMessageDto } from './order-item-sync-message.dto.js';

/**
 * Body of PUT {admin service}/sync/orders/:id — the whole order as it is now, with its items and the
 * customer's name and email (the admin service has no users table).
 */
export class OrderSyncMessageDto {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  totalCents: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemSyncMessageDto[];

  /** The order must be loaded with its items and its user. */
  static fromEntity(order: Order): OrderSyncMessageDto {
    return {
      id: order.id,
      customerId: order.userId,
      customerName: order.user.name,
      customerEmail: order.user.email,
      status: order.status,
      totalCents: order.totalCents,
      version: order.version,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) =>
        OrderItemSyncMessageDto.fromEntity(item),
      ),
    };
  }
}
