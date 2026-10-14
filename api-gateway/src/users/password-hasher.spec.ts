import type { ConfigType } from '@nestjs/config';
import { authConfig } from '../config/auth.config.js';
import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher({
    passwordHashRounds: 4,
  } as ConfigType<typeof authConfig>);

  it('hashes with bcrypt and the configured cost, never keeping the password', async () => {
    const hash = await hasher.hash('correct horse');

    expect(hash).toMatch(/^\$2b\$04\$/);
    expect(hash).not.toContain('correct horse');
  });

  it('accepts the right password and rejects a wrong one', async () => {
    const hash = await hasher.hash('correct horse');

    await expect(hasher.verify('correct horse', hash)).resolves.toBe(true);
    await expect(hasher.verify('wrong horse', hash)).resolves.toBe(false);
  });
});
