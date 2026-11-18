import assert from 'node:assert/strict';
import { open, unlink } from 'node:fs/promises';
import http from 'node:http';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { test } from 'node:test';
import { createServer, preview } from 'vite';

function request(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
    }).on('error', reject);
  });
}

test('development serves JSX and blocks untrusted hosts and private env files', async (t) => {
  // The repository no longer tracks .env. Use a harmless temporary file so the
  // access-denial assertion tests an existing private file, not SPA fallback.
  // Exclusive creation avoids overwriting a developer's local environment.
  const envPath = resolve(cwd(), '.env');
  let fixture;
  try {
    fixture = await open(envPath, 'wx', 0o600);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  if (fixture) {
    t.after(() => unlink(envPath));
    try {
      await fixture.writeFile('ASSISTANTHUB_SMOKE_TEST_ONLY=1\n');
    } finally {
      await fixture.close();
    }
  }

  const server = await createServer({ server: { port: 0 } });
  t.after(() => server.close());
  await server.listen();
  const port = server.httpServer.address().port;

  const page = await request(port, '/AssistantHub/');
  assert.equal(page.status, 200);
  assert.match(page.body, /\/AssistantHub\/src\/index.jsx/);
  const entry = await request(port, '/AssistantHub/src/index.jsx');
  assert.equal(entry.status, 200);
  assert.match(entry.headers['content-type'], /javascript/);
  assert.equal((await request(port, '/AssistantHub/.env')).status, 403);
  assert.equal((await request(port, '/AssistantHub/', { Host: 'attacker.example' })).status, 403);
  const crossOrigin = await request(port, '/AssistantHub/src/index.jsx', { Origin: 'https://attacker.example' });
  assert.equal(crossOrigin.headers['access-control-allow-origin'], undefined);
  assert.equal(crossOrigin.headers['cross-origin-resource-policy'], 'same-origin');
});

test('production preview resolves GitHub Pages assets and public metadata', async (t) => {
  const server = await preview({ preview: { port: 0 } });
  t.after(() => new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve())));
  const port = server.httpServer.address().port;
  const page = await request(port, '/AssistantHub/');
  assert.equal(page.status, 200);
  assert.doesNotMatch(page.body, /%BASE_URL%|%PUBLIC_URL%|\/src\/index/);
  const assetPaths = [...page.body.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(assetPaths.some((path) => path.endsWith('.js')));
  assert.ok(assetPaths.some((path) => path.endsWith('.css')));
  for (const path of assetPaths) {
    assert.ok(path.startsWith('/AssistantHub/'), `Unexpected asset base: ${path}`);
    const asset = await request(port, path);
    assert.equal(asset.status, 200, `Missing production asset: ${path}`);
    if (/\.(?:js|css)$/.test(path)) assert.doesNotMatch(asset.headers['content-type'], /text\/html/);
  }
  const manifest = await request(port, '/AssistantHub/manifest.json');
  assert.equal(JSON.parse(manifest.body).start_url, '.');
});
