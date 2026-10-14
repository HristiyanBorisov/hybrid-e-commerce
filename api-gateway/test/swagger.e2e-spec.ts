import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { createTestApp } from './create-test-app.js';

describe('API documentation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the interactive docs at /api/docs', () => {
    return request(app.getHttpServer())
      .get('/api/docs')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('serves the OpenAPI document at /api/docs-json', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(response.body.info.title).toBe('E-commerce API Gateway');
    expect(response.body.paths).toHaveProperty('/api/health');
    expect(response.body.paths).toHaveProperty('/api/v1/auth/login');
    expect(response.body.paths).toHaveProperty('/api/v1/users/{id}');
    expect(response.body.paths).toHaveProperty('/api/v1/products/{id}');
    expect(response.body.components.securitySchemes).toHaveProperty('bearer');
  });

  it('leaves the internal API (called by the admin service) out of the public docs', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    expect(
      Object.keys(response.body.paths).filter((path) =>
        path.includes('internal'),
      ),
    ).toEqual([]);
  });
});
