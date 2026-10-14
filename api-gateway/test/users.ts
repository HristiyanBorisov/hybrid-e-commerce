import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../src/auth/auth.service.js';
import { CreateUserDto } from '../src/users/dto/create-user.dto.js';
import { User } from '../src/users/user.entity.js';
import { UserRole } from '../src/users/user-role.enum.js';
import { UsersService } from '../src/users/users.service.js';

/** Password of every user created with createUser(). */
export const TEST_PASSWORD = 'secret-password';

/** Creates a user directly through UsersService (a customer unless another role is given). */
export function createUser(
  app: INestApplication,
  overrides: Partial<CreateUserDto> = {},
): Promise<User> {
  return app.get(UsersService).create({
    name: 'Test User',
    email: `user-${randomUUID()}@example.com`,
    password: TEST_PASSWORD,
    role: UserRole.Customer,
    ...overrides,
  });
}

/** A valid login token for the user, as POST /auth/login would return it. */
export async function tokenFor(
  app: INestApplication,
  user: User,
): Promise<string> {
  const { accessToken } = await app
    .get(AuthService)
    .login({ email: user.email, password: TEST_PASSWORD });

  return accessToken;
}
