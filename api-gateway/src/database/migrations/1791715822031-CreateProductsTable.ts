import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * COPY of admin_db.products — written only by the sync from the admin service.
 * deleted_at mirrors the soft delete in the admin service. Prices are integer cents.
 */
export class CreateProductsTable1791715822031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id            uuid         NOT NULL,
        category_id   uuid         NOT NULL,
        sku           varchar(64)  NOT NULL,
        name          varchar(255) NOT NULL,
        slug          varchar(255) NOT NULL,
        description   text,
        price_cents   integer      NOT NULL,
        image_url     varchar(255),
        thumbnail_url varchar(255),
        version       integer      NOT NULL,
        created_at    timestamptz  NOT NULL,
        deleted_at    timestamptz,
        CONSTRAINT products_pkey PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX products_category_id_index ON products (category_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE products`);
  }
}
