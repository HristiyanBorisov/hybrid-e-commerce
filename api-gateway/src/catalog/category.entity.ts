import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * COPY of a category from the admin service, which owns the catalog.
 * Written only by the catalog sync; the id is the admin service's id.
 */
@Entity('categories')
export class Category {
  @PrimaryColumn('uuid')
  id: string;

  /** null = top level */
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column()
  name: string;

  @Column()
  slug: string;

  /** Version of the copy: older sync messages are ignored */
  @Column()
  version: number;
}
