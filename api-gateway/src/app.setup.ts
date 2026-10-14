import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { validationExceptionFactory } from './common/validation/validation-exception.factory.js';
import { setupSwagger } from './swagger.setup.js';

/**
 * Global application setup, shared by main.ts and the e2e tests
 * so the tests always run against the same configuration as the real app.
 */
export function configureApp(app: INestApplication): void {
  // The public API lives under /api. The internal API (/internal/v1/…, called by the admin service) stays
  // outside it, so nginx — which only forwards /api to this service — never exposes it.
  app.setGlobalPrefix('api', { exclude: ['internal/{*path}'] });

  // Reads cookies into request.cookies — the login token can arrive as a cookie
  app.use(cookieParser());

  // Routes are versioned in the URL: /api/v1/products. Controllers without a version are v1.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // silently drop fields the DTO doesn't declare — they never reach the code
      transform: true, // turn payloads into DTO instances (query strings into numbers etc.)
      exceptionFactory: validationExceptionFactory, // 422 with errors grouped by field
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  setupSwagger(app);
}
