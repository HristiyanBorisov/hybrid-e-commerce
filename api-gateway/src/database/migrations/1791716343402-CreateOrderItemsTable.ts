import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lines of an order. The product name and price are copied at order time,
 * so later catalog changes never rewrite past orders. One line per product per order.
 */
export class CreateOrderItemsTable1791716343402 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE order_items (
        id               uuid         NOT NULL,
        order_id         uuid         NOT NULL,
        product_id       uuid         NOT NULL,
        product_name     varchar(255) NOT NULL,
        unit_price_cents integer      NOT NULL,
        quantity         integer      NOT NULL,
        CONSTRAINT order_items_pkey PRIMARY KEY (id),
        CONSTRAINT order_items_order_id_foreign FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
        CONSTRAINT order_items_product_id_foreign FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT,
        CONSTRAINT order_items_order_id_product_id_unique UNIQUE (order_id, product_id),
        CONSTRAINT order_items_unit_price_cents_check CHECK (unit_price_cents >= 0),
        CONSTRAINT order_items_quantity_check CHECK (quantity > 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX order_items_product_id_index ON order_items (product_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE order_items`);
  }
}
