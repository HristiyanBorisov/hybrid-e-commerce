import { Column, CreateDateColumn, Entity } from 'typeorm';
import { UuidEntity } from '../database/uuid.entity.js';
import { StockMovementReason } from './stock-movement-reason.enum.js';

/** One change of a product's stock and why it happened — the history behind every stock level. */
@Entity('stock_movements')
export class StockMovement extends UuidEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  /** The order that caused it; null for a manual adjustment */
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string | null;

  /** Positive adds stock, negative removes it */
  @Column({ name: 'quantity_change' })
  quantityChange: number;

  @Column({
    type: 'enum',
    enum: StockMovementReason,
    enumName: 'stock_movement_reason',
  })
  reason: StockMovementReason;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
