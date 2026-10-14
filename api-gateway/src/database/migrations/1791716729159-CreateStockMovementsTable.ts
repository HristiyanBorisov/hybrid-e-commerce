import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * History of every stock change: by how much and why.
 * Order-related movements must point to their order; manual adjustments must not.
 */
export class CreateStockMovementsTable1791716729159 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE stock_movement_reason AS ENUM ('order_placed', 'order_cancelled', 'adjustment')`,
    );

    await queryRunner.query(`
      CREATE TABLE stock_movements (
        id              uuid                  NOT NULL,
        product_id      uuid                  NOT NULL,
        order_id        uuid,
        quantity_change integer               NOT NULL,
        reason          stock_movement_reason NOT NULL,
        created_at      timestamptz           NOT NULL DEFAULT now(),
        CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
        CONSTRAINT stock_movements_product_id_foreign FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
        CONSTRAINT stock_movements_order_id_foreign FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
        CONSTRAINT stock_movements_quantity_change_check CHECK (quantity_change <> 0),
        CONSTRAINT stock_movements_order_id_check CHECK ((reason = 'adjustment') = (order_id IS NULL))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX stock_movements_product_id_created_at_index ON stock_movements (product_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX stock_movements_order_id_index ON stock_movements (order_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE stock_movements`);
    await queryRunner.query(`DROP TYPE stock_movement_reason`);
  }
}
