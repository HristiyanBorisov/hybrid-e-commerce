import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Customers and admins. Soft-deleted, so their orders stay intact.
 * Emails are stored lowercase and are unique among users that aren't deleted,
 * so a deleted user's email can be registered again.
 */
export class CreateUsersTable1791715537218 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE user_role AS ENUM ('customer', 'admin')`,
    );

    await queryRunner.query(`
      CREATE TABLE users (
        id            uuid         NOT NULL,
        name          varchar(255) NOT NULL,
        email         varchar(255) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role          user_role    NOT NULL DEFAULT 'customer',
        created_at    timestamptz  NOT NULL DEFAULT now(),
        updated_at    timestamptz  NOT NULL DEFAULT now(),
        deleted_at    timestamptz,
        CONSTRAINT users_pkey PRIMARY KEY (id),
        CONSTRAINT users_email_check CHECK (email = lower(email))
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE deleted_at IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TYPE user_role`);
  }
}
