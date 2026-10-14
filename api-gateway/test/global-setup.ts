import { execFileSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

/**
 * Runs once before the e2e tests: brings the test database up to date with the same command as
 * `make migrate`, so the test schema is always the real one.
 *
 * Refuses any database whose name doesn't end with "_test" — the tests must never touch dev data.
 */
export default function setup(project: TestProject): void {
  const database = project.config.env.DB_DATABASE;

  if (!database?.endsWith('_test')) {
    throw new Error(
      `The e2e tests must use a "_test" database, but DB_DATABASE is "${database}".`,
    );
  }

  execFileSync('npm', ['run', 'migration:run'], {
    env: { ...process.env, DB_DATABASE: database },
    stdio: 'pipe',
  });
}
