import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readKey } from './auth.config.js';

describe('readKey', () => {
  it('reads a key file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'keys-')), 'key.pem');
    writeFileSync(path, '-----BEGIN PUBLIC KEY-----');

    expect(readKey(path)).toBe('-----BEGIN PUBLIC KEY-----');
  });

  it('explains how to create the keys when the file is missing', () => {
    expect(() => readKey('/nowhere/jwt-private.pem')).toThrow(
      'JWT key not found at "/nowhere/jwt-private.pem". Run `make keys` to create the key pair.',
    );
  });

  it('reports a missing setting the same way', () => {
    expect(() => readKey(undefined)).toThrow('Run `make keys`');
  });
});
