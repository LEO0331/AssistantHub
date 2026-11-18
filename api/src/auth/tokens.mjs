import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

const ISSUER = 'assistanthub-api';
const AUDIENCE = 'assistanthub-browser';
const EXPIRY_SECONDS = 15 * 60;

export function validateJwtSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32 ||
      Buffer.byteLength(secret, 'utf8') > 512) {
    throw new Error('AUTH_JWT_SECRET must be a privately managed random value of 32–512 bytes');
  }
  return new TextEncoder().encode(secret);
}

export function createTokenService(secret) {
  const key = validateJwtSecret(secret);
  return {
    async issue(userId) {
      return new SignJWT({})
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(userId)
        .setIssuedAt()
        .setJti(randomUUID())
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime(EXPIRY_SECONDS + 's')
        .sign(key);
    },
    async verify(token) {
      const { payload } = await jwtVerify(token, key, {
        issuer: ISSUER,
        audience: AUDIENCE,
        algorithms: ['HS256'],
        maxTokenAge: EXPIRY_SECONDS + 's'
      });
      if (typeof payload.sub !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(payload.sub)) {
        throw new Error('Invalid token subject');
      }
      return payload.sub;
    },
    expiresIn: EXPIRY_SECONDS
  };
}
