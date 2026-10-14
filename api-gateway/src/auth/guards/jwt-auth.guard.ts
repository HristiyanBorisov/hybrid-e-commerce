import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AccessTokenVerifier } from '../access-token-verifier.js';
import { AUTH_COOKIE } from '../auth-cookie.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { requestFrom } from '../request-from-context.js';

/**
 * Runs on every route and GraphQL operation (registered globally): a valid login token is needed unless it's
 * marked @Public().
 *
 * The token is read from the "Authorization: Bearer …" header, or else from the login cookie, and turned into
 * the current user by AccessTokenVerifier — so a deleted user is rejected immediately and the user's current
 * role is used, not the one written in the token.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = requestFrom(context);
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const user = await this.accessTokens.userFor(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    request.user = user;
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type === 'Bearer' && token) {
      return token;
    }

    return (request.cookies as Record<string, string> | undefined)?.[
      AUTH_COOKIE
    ];
  }
}
