import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  type Relation,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { UuidEntity } from '../database/uuid.entity.js';
import { User } from '../users/user.entity.js';
import { OrderItem } from './order-item.entity.js';
import { OrderStatus } from './order-status.enum.js';

/** Where an order can go from each status. Delivered and cancelled orders are final. */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
};

/** A customer's order. This service owns orders; the admin service gets a copy. */
@Entity('orders')
export class Order extends UuidEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    default: OrderStatus.Pending,
  })
  status: OrderStatus;

  /** Sum of the items, in cents */
  @Column({ name: 'total_cents' })
  totalCents: number;

  /** The payment provider's reference, once paid */
  @Column({ name: 'payment_reference', type: 'varchar', nullable: true })
  paymentReference: string | null;

  /** Goes up with every change, so the admin service can ignore outdated sync messages */
  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items: Relation<OrderItem>[];

  canMoveTo(status: OrderStatus): boolean {
    return NEXT_STATUSES[this.status].includes(status);
  }
}
