import { UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authConfig } from '../config/auth.config.js';
import { PasswordHasher } from '../users/password-hasher.js';
import { User } from '../users/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const user = Object.assign(new User(), {
    name: 'Eve',
    email: 'eve@example.com',
    passwordHash: 'stored-hash',
    role: UserRole.Customer,
  });
  const usersService = { create: vi.fn(), findByEmail: vi.fn() };
  const passwordHasher = { verify: vi.fn() };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('signed-token') };
  const service = new AuthService(
    usersService as unknown as UsersService,
    passwordHasher as unknown as PasswordHasher,
    jwtService as unknown as JwtService,
    { tokenTtlSeconds: 3600 } as ConfigType<typeof authConfig>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers new users as customers', async () => {
    usersService.create.mockResolvedValueOnce(user);

    await service.register({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'secret-password',
    });

    expect(usersService.create).toHaveBeenCalledWith({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'secret-password',
      role: UserRole.Customer,
    });
  });

  it('logs in with the right password and returns a signed token', async () => {
    usersService.findByEmail.mockResolvedValueOnce(user);
    passwordHasher.verify.mockResolvedValueOnce(true);

    const token = await service.login({
      email: 'eve@example.com',
      password: 'secret-password',
    });

    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'secret-password',
      'stored-hash',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: 'eve@example.com',
      name: 'Eve',
      role: UserRole.Customer,
    });
    expect(token).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });

  it('rejects a wrong password with 401', async () => {
    usersService.findByEmail.mockResolvedValueOnce(user);
    passwordHasher.verify.mockResolvedValueOnce(false);

    await expect(
      service.login({ email: 'eve@example.com', password: 'wrong' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('still checks a (dummy) hash for an unknown email, then rejects with the same 401', async () => {
    usersService.findByEmail.mockResolvedValueOnce(null);
    passwordHasher.verify.mockResolvedValueOnce(false);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'whatever' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'whatever',
      expect.stringMatching(/^\$2b\$12\$/),
    );
  });
});
