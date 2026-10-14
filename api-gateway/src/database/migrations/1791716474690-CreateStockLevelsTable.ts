import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Current stock per product. The CHECK makes overselling impossible,
 * even if the application code had a bug.
 */
export class CreateStockLevelsTable1791716474690 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE stock_levels (
        product_id uuid        NOT NULL,
        quantity   integer     NOT NULL DEFAULT 0,
        version    integer     NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT stock_levels_pkey PRIMARY KEY (product_id),
        CONSTRAINT stock_levels_product_id_foreign FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
        CONSTRAINT stock_levels_quantity_check CHECK (quantity >= 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE stock_levels`);
  }
}
