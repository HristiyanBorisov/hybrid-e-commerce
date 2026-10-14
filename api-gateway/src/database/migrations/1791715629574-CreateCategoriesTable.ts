import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * COPY of admin_db.categories — written only by the sync from the admin service, which owns the catalog.
 * No foreign keys: sync messages can arrive in any order (a child before its parent).
 */
export class CreateCategoriesTable1791715629574 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id        uuid         NOT NULL,
        parent_id uuid,
        name      varchar(255) NOT NULL,
        slug      varchar(255) NOT NULL,
        version   integer      NOT NULL,
        CONSTRAINT categories_pkey PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX categories_parent_id_index ON categories (parent_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE categories`);
  }
}
