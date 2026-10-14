import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AccessTokenPayload } from './access-token-payload.js';

/**
 * Turns a login token into its user — used for HTTP requests (JwtAuthGuard) and WebSocket connections.
 * After the signature check the user is loaded again, so a deleted user is rejected at once and the current
 * role is used, not the one written in the token.
 */
@Injectable()
export class AccessTokenVerifier {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  /** null when the token is invalid or expired, or its user no longer exists. */
  async userFor(token: string): Promise<User | null> {
    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(token);

      return await this.usersService.findByIdOrNull(payload.sub);
    } catch {
      return null;
    }
  }
}
