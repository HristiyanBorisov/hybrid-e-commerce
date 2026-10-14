import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { UsersService } from '../src/users/users.service.js';
import { createTestApp } from './create-test-app.js';
import { resetDatabase } from './database.js';
import { createUser, TEST_PASSWORD, tokenFor } from './users.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('creates a customer and normalizes the email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Eve',
          email: '  Eve@Example.COM ',
          password: TEST_PASSWORD,
        })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'Eve',
        email: 'eve@example.com',
        role: 'customer',
        createdAt: expect.any(String),
      });
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('ignores a role sent by the caller: self-registered users are always customers', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Eve',
          email: 'eve@example.com',
          password: TEST_PASSWORD,
          role: 'admin',
        })
        .expect(201);

      expect(response.body.role).toBe('customer');
    });

    it('answers invalid input with 422 and the problems per field', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: '', email: 'not-an-email', password: 'short' })
        .expect(422);

      expect(Object.keys(response.body.errors)).toEqual([
        'name',
        'email',
        'password',
      ]);
    });

    it('answers an email that is already registered with 409, whatever its letter case', async () => {
      await createUser(app, { email: 'eve@example.com' });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Eve',
          email: 'EVE@example.com',
          password: TEST_PASSWORD,
        })
        .expect(409)
        .expect({ statusCode: 409, message: 'Email is already registered' });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns a token and sets it as an HttpOnly cookie', async () => {
      await createUser(app, { email: 'eve@example.com' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'Eve@Example.com', password: TEST_PASSWORD })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
      expect(response.headers['set-cookie'][0]).toMatch(
        new RegExp(
          `^access_token=${response.body.accessToken}; Max-Age=3600; Path=/; Expires=.+; HttpOnly; SameSite=Lax$`,
        ),
      );
    });

    it('rejects a wrong password and an unknown email with the same 401', async () => {
      await createUser(app, { email: 'eve@example.com' });
      const unauthorized = {
        statusCode: 401,
        message: 'Invalid email or password',
      };

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'eve@example.com', password: 'wrong-password' })
        .expect(401)
        .expect(unauthorized);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: TEST_PASSWORD })
        .expect(401)
        .expect(unauthorized);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the logged-in user, with the token in the Authorization header', async () => {
      const user = await createUser(app);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${await tokenFor(app, user)}`)
        .expect(200);

      expect(response.body.id).toBe(user.id);
    });

    it('also accepts the login cookie (the session shared with the admin panel)', async () => {
      const user = await createUser(app);

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Cookie', `access_token=${await tokenFor(app, user)}`)
        .expect(200);

      expect(response.body.email).toBe(user.email);
    });

    it('requires a login', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401)
        .expect({ statusCode: 401, message: 'Authentication required' });
    });

    it('rejects a token that is not valid', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not.a.token')
        .expect(401)
        .expect({ statusCode: 401, message: 'Invalid or expired token' });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears the login cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(204);

      expect(response.headers['set-cookie'][0]).toMatch(
        /^access_token=; Path=\/; Expires=Thu, 01 Jan 1970/,
      );
    });
  });

  describe('a deleted user', () => {
    it('loses access immediately, even with a token that has not expired', async () => {
      const user = await createUser(app);
      const token = await tokenFor(app, user);
      const admin = await createUser(app, { role: UserRole.Admin });

      await app.get(UsersService).remove(user.id, admin.id);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it("can't log in anymore, and the email can be registered again", async () => {
      const user = await createUser(app, { email: 'eve@example.com' });
      const admin = await createUser(app, { role: UserRole.Admin });
      await app.get(UsersService).remove(user.id, admin.id);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'eve@example.com', password: TEST_PASSWORD })
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Eve again',
          email: 'eve@example.com',
          password: TEST_PASSWORD,
        })
        .expect(201);
    });
  });
});
