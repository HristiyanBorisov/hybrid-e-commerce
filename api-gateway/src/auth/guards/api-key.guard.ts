import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { internalApiConfig } from '../../config/internal-api.config.js';

export const API_KEY_HEADER = 'x-api-key';

/**
 * Lets only the admin service in: the X-Api-Key header must be the shared API key.
 * Used on the internal API (see @InternalApi()), where no user is logged in.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(internalApiConfig.KEY)
    private readonly config: ConfigType<typeof internalApiConfig>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const apiKey = context
      .switchToHttp()
      .getRequest<Request>()
      .header(API_KEY_HEADER);

    if (!apiKey || !this.isValid(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  /** Compared in constant time, so the response time doesn't reveal how much of the key was right. */
  private isValid(apiKey: string): boolean {
    const given = Buffer.from(apiKey);
    const expected = Buffer.from(this.config.apiKey);

    return given.length === expected.length && timingSafeEqual(given, expected);
  }
}
