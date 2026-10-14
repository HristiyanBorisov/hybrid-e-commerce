import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    // Loaded first, like in the running Nest app: decorators (DTOs, entities) store their metadata through it
    setupFiles: ['reflect-metadata'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          env: {
            // Their own database and Redis databases (never the dev ones)
            DB_DATABASE: 'gateway_db_test',
            CACHE_REDIS_URL: 'redis://redis:6379/4',
            QUEUE_REDIS_URL: 'redis://redis:6379/5',
            ELASTICSEARCH_INDEX: 'products_test',
            // Fast password hashing (production uses cost 12)
            BCRYPT_ROUNDS: '4',
            INTERNAL_API_KEY: 'test-internal-api-key',
            // Nothing answers at these hosts: no test can reach the admin service or send real email
            ADMIN_SERVICE_INTERNAL_URL: 'http://admin-service.test/internal/v1',
            MAIL_HOST: 'mail.test',
          },
          globalSetup: ['test/global-setup.ts'],
          // The test files share one database, so they run one after another
          fileParallelism: false,
        },
      },
    ],
    // Coverage is measured over unit and e2e tests together; the run fails below 90%
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts', // bootstrap only — the e2e tests use the same configureApp()
        'src/**/*.module.ts', // declarative wiring, exercised by the e2e tests
        // DTOs are declarations (validation rules, Swagger and GraphQL types). The e2e tests run every line, but
        // their decorators make the compiler emit metadata branches ("typeof X === undefined ? …") no test can take
        'src/**/dto/**',
        'src/database/data-source.ts', // used only by the migration CLI
        'src/database/seeds/seed.ts', // entry script only — the seeders themselves are tested
        'src/admin-sync/resync.ts', // entry script only — it just queues the jobs
        'src/catalog/reindex.ts', // entry script only — ProductSearch.reindexAll() is tested
        'src/database/migrations/**', // verified against docs/schema.sql
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
