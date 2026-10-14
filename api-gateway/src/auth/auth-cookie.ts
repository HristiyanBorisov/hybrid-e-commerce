import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { authConfig } from '../config/auth.config.js';

/** Name of the login cookie. Both services are on one domain (nginx), so the admin service receives it too. */
export const AUTH_COOKIE = 'access_token';

/**
 * Writes and clears the login cookie.
 * - HttpOnly: scripts in the page can't read the token
 * - SameSite=Lax: other websites can't send it along with their POST requests (CSRF)
 * - Secure in production: only sent over HTTPS
 */
@Injectable()
export class AuthCookie {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  set(response: Response, token: string): void {
    response.cookie(AUTH_COOKIE, token, {
      ...this.options(),
      maxAge: this.config.tokenTtlSeconds * 1000,
    });
  }

  clear(response: Response): void {
    response.clearCookie(AUTH_COOKIE, this.options());
  }

  private options(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.cookieSecure,
      path: '/',
    };
  }
}
