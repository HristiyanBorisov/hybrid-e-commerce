import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { createTestApp } from './create-test-app.js';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('database', () => {
    it('is connected to the test database, never the dev database', async () => {
      const [{ database }] = await app
        .get(DataSource)
        .query<{ database: string }[]>('SELECT current_database() AS database');

      expect(database).toBe('gateway_db_test');
    });

    it('has the schema created by the migrations', async () => {
      const [{ table }] = await app
        .get(DataSource)
        .query<{ table: string | null }[]>(
          `SELECT to_regclass('stock_movements') AS table`,
        );

      expect(table).toBe('stock_movements');
    });
  });

  describe('errors', () => {
    it('answers unknown routes with the standard error format', () => {
      return request(app.getHttpServer())
        .get('/api/v1/does-not-exist')
        .expect(404)
        .expect({
          statusCode: 404,
          message: 'Cannot GET /api/v1/does-not-exist',
        });
    });

    it('answers malformed JSON with 400 in the standard error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/anything')
        .set('Content-Type', 'application/json')
        .send('{"broken": ');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        statusCode: 400,
        message: expect.any(String),
      });
    });
  });

  describe('request id', () => {
    it('adds an X-Request-Id to every response', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/does-not-exist',
      );

      expect(response.headers['x-request-id']).toMatch(/^[\w-]+$/);
    });

    it("reuses the caller's X-Request-Id", () => {
      return request(app.getHttpServer())
        .get('/api/v1/does-not-exist')
        .set('X-Request-Id', 'trace-123')
        .expect('X-Request-Id', 'trace-123');
    });
  });
});
