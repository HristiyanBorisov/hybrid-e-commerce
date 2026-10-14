import { OrderItem } from '../../orders/order-item.entity.js';

/** One item of an order sync message. */
export class OrderItemSyncMessageDto {
  id: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;

  static fromEntity(item: OrderItem): OrderItemSyncMessageDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
    };
  }
}
