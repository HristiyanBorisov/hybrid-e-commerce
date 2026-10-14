import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Creates the RSA key pair for login tokens (`make keys`):
 *   jwt-private.pem        — signs tokens; only the API gateway has it
 *   public/jwt-public.pem  — verifies tokens; the admin service mounts only the public/ folder
 *
 * Existing keys are never overwritten: new keys would invalidate every token that was already issued.
 */
const directory = process.argv[2];
const privateKeyPath = join(directory, 'jwt-private.pem');
const publicKeyPath = join(directory, 'public', 'jwt-public.pem');

if (existsSync(privateKeyPath)) {
  console.log(`Keys already exist in ${directory} — nothing to do.`);
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

mkdirSync(join(directory, 'public'), { recursive: true });
writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

console.log(`Created ${privateKeyPath} and ${publicKeyPath}.`);
