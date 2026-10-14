import { registerAs } from '@nestjs/config';
import { readFileSync } from 'node:fs';

/**
 * Login settings, injected with `@Inject(authConfig.KEY)`.
 * Tokens are signed with RS256: the private key signs (only this service has it),
 * the public key verifies (the admin service gets only this one).
 */
export const authConfig = registerAs('auth', () => ({
  privateKey: readKey(process.env.JWT_PRIVATE_KEY_PATH),
  publicKey: readKey(process.env.JWT_PUBLIC_KEY_PATH),
  issuer: 'api-gateway',
  tokenTtlSeconds: Number(process.env.JWT_TTL),
  passwordHashRounds: Number(process.env.BCRYPT_ROUNDS),
  // Secure cookies are only sent over HTTPS — on in production, off for local http://localhost
  cookieSecure: process.env.AUTH_COOKIE_SECURE === 'true',
}));

export function readKey(path: string | undefined): string {
  try {
    return readFileSync(path ?? '', 'utf8');
  } catch {
    throw new Error(
      `JWT key not found at "${path}". Run \`make keys\` to create the key pair.`,
    );
  }
}
