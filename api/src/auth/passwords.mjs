import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const TAG = 'scrypt';
const HASH_LENGTH = 64;
const DUMMY_SALT = Buffer.alloc(16).toString('base64url');
const DUMMY_DIGEST = Buffer.alloc(HASH_LENGTH).toString('base64url');
export const DUMMY_PASSWORD_HASH = TAG + '$16384$8$1$' + DUMMY_SALT + '$' + DUMMY_DIGEST;

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128 ||
      Buffer.byteLength(password, 'utf8') > 256) {
    throw new Error('Password must contain 12–128 characters (maximum 256 UTF-8 bytes)');
  }
  const salt = randomBytes(16);
  const digest = await scrypt(password, salt, HASH_LENGTH, PARAMS);
  return [TAG, PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64url'),
    digest.toString('base64url')].join('$');
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== 'string' || password.length > 128 ||
      Buffer.byteLength(password, 'utf8') > 256 || typeof encodedHash !== 'string') return false;
  const parts = encodedHash.split('$');
  if (parts.length !== 6 || parts[0] !== TAG ||
      parts[1] !== '16384' || parts[2] !== '8' || parts[3] !== '1' ||
      !/^[A-Za-z0-9_-]+$/.test(parts[4]) || !/^[A-Za-z0-9_-]+$/.test(parts[5])) return false;
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  if (salt.length !== 16 || expected.length !== HASH_LENGTH) return false;
  const actual = await scrypt(password, salt, HASH_LENGTH, PARAMS);
  return timingSafeEqual(actual, expected);
}
