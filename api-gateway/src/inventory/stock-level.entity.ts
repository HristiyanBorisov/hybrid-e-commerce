import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  type Relation,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Product } from '../catalog/product.entity.js';

/** How many units of a product are in stock. This service owns stock; the admin service gets a copy. */
@Entity('stock_levels')
export class StockLevel {
  @PrimaryColumn({ name: 'product_id', type: 'uuid' })
  productId: string;

  @OneToOne(() => Product, (product) => product.stockLevel)
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  /** Never below 0 (a CHECK in the database) */
  @Column()
  quantity: number;

  /** Goes up with every change, so the admin service can ignore outdated sync messages */
  @VersionColumn()
  version: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
