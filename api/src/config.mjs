import process from 'node:process';

function port(value, name, fallback) {
  const raw = value ?? String(fallback);
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(name + ' must be a valid TCP port');
  }
  return n;
}

export function databaseConfig(env = process.env) {
  for (const key of ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']) {
    if (typeof env[key] !== 'string' || env[key].trim().length === 0) {
      throw new Error('Missing required setting: ' + key);
    }
  }
  if (!/^[a-zA-Z0-9_]+$/.test(env.DB_NAME)) {
    throw new Error('DB_NAME must contain only letters, digits, or underscores');
  }
  return {
    host: env.DB_HOST,
    port: port(env.DB_PORT, 'DB_PORT', 3306),
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD
  };
}

export function serverConfig(env = process.env) {
  const corsOrigin = env.API_CORS_ORIGIN || '';
  if (corsOrigin) {
    let parsed;
    try { parsed = new URL(corsOrigin); }
    catch { throw new Error('API_CORS_ORIGIN must be a valid origin'); }
    if (parsed.origin !== corsOrigin || !['https:', 'http:'].includes(parsed.protocol) ||
      (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname))) {
      throw new Error('API_CORS_ORIGIN must be an exact HTTPS or loopback HTTP origin');
    }
  }
  return {
    host: env.API_HOST || '127.0.0.1',
    port: port(env.API_PORT, 'API_PORT', 3100),
    corsOrigin
  };
}
