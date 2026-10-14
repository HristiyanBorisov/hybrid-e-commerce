import { Column, Entity, JoinColumn, ManyToOne, type Relation } from 'typeorm';
import { UuidEntity } from '../database/uuid.entity.js';
import { Order } from './order.entity.js';

/**
 * One product in an order. The product's name and price are copied when the order is placed,
 * so later product changes never rewrite past orders.
 */
@Entity('order_items')
export class OrderItem extends UuidEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Relation<Order>;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'unit_price_cents' })
  unitPriceCents: number;

  @Column()
  quantity: number;
}
