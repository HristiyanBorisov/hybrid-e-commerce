import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { authConfig } from '../config/auth.config.js';

/** Hashes and checks passwords with bcrypt. Nothing else in the app knows which algorithm is used. */
@Injectable()
export class PasswordHasher {
  constructor(
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.passwordHashRounds);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
