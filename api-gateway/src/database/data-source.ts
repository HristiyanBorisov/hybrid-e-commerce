import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../config/database.config.js';

/**
 * Connection used by the TypeORM CLI to run migrations (`make migrate`).
 *
 * The schema is changed only by migrations, never synchronized from the entities:
 * every change is reviewable and runs the same way in every environment.
 */
export default new DataSource({
  type: 'postgres',
  ...databaseConfig(),
  synchronize: false,
  // .ts when run from the source code, .js when run from the compiled build
  migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
});
