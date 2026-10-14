import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Orders placed by customers. Totals are integer cents.
 * version goes up on every change, so the admin service can ignore outdated sync messages.
 */
export class CreateOrdersTable1791716148845 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled')`,
    );

    await queryRunner.query(`
      CREATE TABLE orders (
        id                uuid         NOT NULL,
        user_id           uuid         NOT NULL,
        status            order_status NOT NULL DEFAULT 'pending',
        total_cents       integer      NOT NULL,
        payment_reference varchar(255),
        version           integer      NOT NULL DEFAULT 1,
        created_at        timestamptz  NOT NULL DEFAULT now(),
        updated_at        timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT orders_pkey PRIMARY KEY (id),
        CONSTRAINT orders_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
        CONSTRAINT orders_total_cents_check CHECK (total_cents >= 0)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX orders_user_id_created_at_index ON orders (user_id, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE orders`);
    await queryRunner.query(`DROP TYPE order_status`);
  }
}
