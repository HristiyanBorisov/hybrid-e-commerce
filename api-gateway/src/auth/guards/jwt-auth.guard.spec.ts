import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync } from 'node:crypto';
import { User } from '../../users/user.entity.js';
import { UserRole } from '../../users/user-role.enum.js';
import { UsersService } from '../../users/users.service.js';
import { AccessTokenVerifier } from '../access-token-verifier.js';
import { Public } from '../decorators/public.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function rsaKeyPair(): { privateKey: string; publicKey: string } {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
}

class ExampleController {
  @Public()
  openRoute(): void {}

  protectedRoute(): void {}
}

describe('JwtAuthGuard', () => {
  const keys = rsaKeyPair();
  const jwtService = new JwtService({
    ...keys,
    signOptions: { algorithm: 'RS256' },
    verifyOptions: { algorithms: ['RS256'] },
  });
  const user = Object.assign(new User(), {
    email: 'eve@example.com',
    role: UserRole.Customer,
  });
  const usersService = { findByIdOrNull: vi.fn() };
  const guard = new JwtAuthGuard(
    new Reflector(),
    new AccessTokenVerifier(
      jwtService,
      usersService as unknown as UsersService,
    ),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    usersService.findByIdOrNull.mockResolvedValue(user);
  });

  function contextFor(
    request: {
      headers?: Record<string, string>;
      cookies?: Record<string, string>;
      user?: User;
    },
    handler: () => void = ExampleController.prototype.protectedRoute,
  ): ExecutionContext {
    request.headers ??= {};

    return {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => ExampleController,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function tokenFor(subject: string): Promise<string> {
    return jwtService.signAsync({ sub: subject, role: UserRole.Customer });
  }

  it('lets anyone call a @Public() route', async () => {
    await expect(
      guard.canActivate(contextFor({}, ExampleController.prototype.openRoute)),
    ).resolves.toBe(true);
  });

  it('requires a token on every other route', async () => {
    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(
      new UnauthorizedException('Authentication required'),
    );
  });

  it('accepts a token from the Authorization header and attaches the current user', async () => {
    const request = {
      headers: { authorization: `Bearer ${await tokenFor(user.id)}` },
    } as { user?: User };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(usersService.findByIdOrNull).toHaveBeenCalledWith(user.id);
    expect(request.user).toBe(user);
  });

  it('accepts a token from the login cookie', async () => {
    const request = { cookies: { access_token: await tokenFor(user.id) } } as {
      user?: User;
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toBe(user);
  });

  it('ignores an Authorization header that is not a Bearer token', async () => {
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Basic abc' } }),
      ),
    ).rejects.toThrow('Authentication required');
  });

  it('rejects an expired token', async () => {
    const expired = await jwtService.signAsync({
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: `Bearer ${expired}` } }),
      ),
    ).rejects.toThrow(new UnauthorizedException('Invalid or expired token'));
  });

  it('rejects a token signed with a different key', async () => {
    const forged = await new JwtService({
      privateKey: rsaKeyPair().privateKey,
      signOptions: { algorithm: 'RS256' },
    }).signAsync({ sub: user.id, role: UserRole.Admin });

    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: `Bearer ${forged}` } }),
      ),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('rejects a valid token whose user was deleted in the meantime', async () => {
    usersService.findByIdOrNull.mockResolvedValueOnce(null);

    await expect(
      guard.canActivate(
        contextFor({
          headers: { authorization: `Bearer ${await tokenFor(user.id)}` },
        }),
      ),
    ).rejects.toThrow('Invalid or expired token');
  });
});
