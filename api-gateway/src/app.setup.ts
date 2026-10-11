import { INestApplication } from '@nestjs/common';

/**
 * Global application setup, shared by main.ts and the e2e tests
 * so the tests always run against the same configuration as the real app.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
}
