import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { User } from '../src/users/user.entity.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { createUser, TEST_PASSWORD, tokenFor } from './users.js';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let admin: User;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    admin = await createUser(app, {
      name: 'Admin',
      email: 'admin@example.com',
      role: UserRole.Admin,
    });
    adminToken = await tokenFor(app, admin);
  });

  afterAll(async () => {
    await app.close();
  });

  function asAdmin(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
  ): request.Test {
    return request(app.getHttpServer())
      [method](url)
      .set('Authorization', `Bearer ${adminToken}`);
  }

  describe('access', () => {
    it('requires a login', () => {
      return request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('is for admins only: customers get 403', async () => {
      const customer = await createUser(app);

      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${await tokenFor(app, customer)}`)
        .expect(403)
        .expect({
          statusCode: 403,
          message: "You don't have permission to do this",
        });
    });

    it('uses the current role, not the one in the token: a demoted admin loses access at once', async () => {
      const otherAdmin = await createUser(app, { role: UserRole.Admin });
      const otherAdminToken = await tokenFor(app, otherAdmin);

      await asAdmin('patch', `/api/v1/users/${otherAdmin.id}`)
        .send({ role: 'customer' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/users', () => {
    it('returns one page of users, newest first, with pagination info', async () => {
      await createUser(app, { name: 'Alice' });
      await createUser(app, { name: 'Bob' });

      const response = await asAdmin(
        'get',
        '/api/v1/users?page=1&limit=2',
      ).expect(200);

      expect(response.body.data.map((user: User) => user.name)).toEqual([
        'Bob',
        'Alice',
      ]);
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('searches name and email and filters by role', async () => {
      await createUser(app, { name: 'Alice', email: 'alice@shop.example' });
      await createUser(app, {
        name: 'Bob',
        email: 'bob@shop.example',
        role: UserRole.Admin,
      });

      const bySearch = await asAdmin('get', '/api/v1/users?search=SHOP').expect(
        200,
      );
      const byRoleAndSearch = await asAdmin(
        'get',
        '/api/v1/users?search=shop&role=admin',
      ).expect(200);

      expect(bySearch.body.data.map((user: User) => user.name)).toEqual([
        'Bob',
        'Alice',
      ]);
      expect(byRoleAndSearch.body.data.map((user: User) => user.name)).toEqual([
        'Bob',
      ]);
    });

    it('answers invalid query parameters with 422 and ignores unknown ones', async () => {
      await asAdmin('get', '/api/v1/users?page=0&limit=500&role=owner').expect(
        422,
      );
      await asAdmin('get', '/api/v1/users?offset=5&sort=name').expect(200);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns the user', async () => {
      const user = await createUser(app, { name: 'Alice' });

      const response = await asAdmin('get', `/api/v1/users/${user.id}`).expect(
        200,
      );

      expect(response.body).toMatchObject({
        id: user.id,
        name: 'Alice',
        role: 'customer',
      });
    });

    it('answers a malformed id with 400 and an unknown one with 404', async () => {
      await asAdmin('get', '/api/v1/users/not-a-uuid').expect(400);
      await asAdmin('get', '/api/v1/users/0199e3a0-0000-7000-8000-000000000000')
        .expect(404)
        .expect({ statusCode: 404, message: 'User not found' });
    });
  });

  describe('POST /api/v1/users', () => {
    it('creates a user with any role', async () => {
      const response = await asAdmin('post', '/api/v1/users')
        .send({
          name: 'New Admin',
          email: 'new-admin@example.com',
          password: TEST_PASSWORD,
          role: 'admin',
        })
        .expect(201);

      expect(response.body).toMatchObject({ name: 'New Admin', role: 'admin' });
    });

    it('validates the input and rejects a taken email', async () => {
      await asAdmin('post', '/api/v1/users')
        .send({
          name: 'X',
          email: 'x@example.com',
          password: TEST_PASSWORD,
          role: 'owner',
        })
        .expect(422);

      await asAdmin('post', '/api/v1/users')
        .send({
          name: 'Copy',
          email: 'ADMIN@example.com',
          password: TEST_PASSWORD,
          role: 'customer',
        })
        .expect(409);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('changes only the fields that are sent, and a new password works at once', async () => {
      const user = await createUser(app, {
        name: 'Alice',
        email: 'alice@example.com',
      });

      const response = await asAdmin('patch', `/api/v1/users/${user.id}`)
        .send({ name: 'Alice Adams', password: 'brand-new-password' })
        .expect(200);

      expect(response.body).toMatchObject({
        name: 'Alice Adams',
        email: 'alice@example.com',
        role: 'customer',
      });
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'brand-new-password' })
        .expect(200);
    });

    it("doesn't let admins change their own role", () => {
      return asAdmin('patch', `/api/v1/users/${admin.id}`)
        .send({ role: 'customer' })
        .expect(403)
        .expect({ statusCode: 403, message: "You can't change your own role" });
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('soft-deletes the user: it disappears from the API', async () => {
      const user = await createUser(app);

      await asAdmin('delete', `/api/v1/users/${user.id}`).expect(204);
      await asAdmin('get', `/api/v1/users/${user.id}`).expect(404);
    });

    it("doesn't let admins delete themselves", () => {
      return asAdmin('delete', `/api/v1/users/${admin.id}`).expect(403).expect({
        statusCode: 403,
        message: "You can't delete your own account",
      });
    });
  });
});
