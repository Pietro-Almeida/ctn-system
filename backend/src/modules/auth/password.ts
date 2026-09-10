import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = (await deriveKey(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const valid = /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, salt, hash] = encoded.split('$');
  // Run the same expensive operation even for missing users and legacy hashes.
  const key = (await deriveKey(
    password,
    valid ? salt : '0'.repeat(32),
    64,
  )) as Buffer;
  return valid && timingSafeEqual(key, Buffer.from(hash, 'hex'));
}
