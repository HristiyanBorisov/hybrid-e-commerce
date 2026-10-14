import { registerAs } from '@nestjs/config';

/**
 * PostgreSQL connection settings, injected with `@Inject(databaseConfig.KEY)`.
 * Also called directly by the migration command (data-source.ts), so they're defined only here.
 */
export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
}));
