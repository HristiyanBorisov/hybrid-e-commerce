import type { ConfigType } from '@nestjs/config';
import { Response } from 'express';
import { authConfig } from '../config/auth.config.js';
import { AuthCookie } from './auth-cookie.js';

describe('AuthCookie', () => {
  const response = { cookie: vi.fn(), clearCookie: vi.fn() };

  function authCookie(cookieSecure: boolean): AuthCookie {
    return new AuthCookie({ tokenTtlSeconds: 3600, cookieSecure } as ConfigType<
      typeof authConfig
    >);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets an HttpOnly, SameSite=Lax cookie that expires with the token', () => {
    authCookie(false).set(response as unknown as Response, 'the-token');

    expect(response.cookie).toHaveBeenCalledWith('access_token', 'the-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 3_600_000,
    });
  });

  it('marks the cookie Secure (HTTPS only) when configured', () => {
    authCookie(true).set(response as unknown as Response, 'the-token');

    expect(response.cookie).toHaveBeenCalledWith(
      'access_token',
      'the-token',
      expect.objectContaining({ secure: true }),
    );
  });

  it('clears the cookie with the same attributes', () => {
    authCookie(false).clear(response as unknown as Response);

    expect(response.clearCookie).toHaveBeenCalledWith('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  });
});
