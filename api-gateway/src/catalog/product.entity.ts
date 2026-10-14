import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { StockLevel } from '../inventory/stock-level.entity.js';
import { Category } from './category.entity.js';

/**
 * COPY of a product from the admin service, which owns the catalog.
 * Written only by the catalog sync; the id is the admin service's id.
 * Soft-deleted products stay (orders point to them), but TypeORM leaves them out of every normal query.
 */
@Entity('products')
export class Product {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  /** null while the category hasn't been synced yet (sync messages can arrive in any order) */
  @ManyToOne(() => Category, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @Column()
  sku: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** 1999 = 19.99 */
  @Column({ name: 'price_cents' })
  priceCents: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  /** Version of the copy: older sync messages are ignored */
  @Column()
  version: number;

  /** When the product was created in the admin service */
  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;

  /** Owned by this service (inventory), not copied. null until the product is first stocked. */
  @OneToOne(() => StockLevel, (stockLevel) => stockLevel.product)
  stockLevel: Relation<StockLevel> | null;
}
