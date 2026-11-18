import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyPagesArtifact } from './release-guard.mjs';

function fixture(t, { origin = '', path = '/AssistantHub/assets/main.js' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'assistanthub-pages-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), [
    '<html><head><meta name="assistanthub-api-base-url" content="' + origin + '">',
    '<link href="/AssistantHub/assets/main.css" rel="stylesheet">',
    '<script type="module" src="' + path + '"></script>',
    '<link href="/AssistantHub/manifest.json" rel="manifest"></head></html>'
  ].join(''));
  writeFileSync(join(root, 'assets', 'main.js'), 'console.log("offline demo")');
  writeFileSync(join(root, 'assets', 'main.css'), 'body{}');
  writeFileSync(join(root, 'manifest.json'), '{"start_url":"."}');
  return root;
}

test('offline GitHub Pages build with correct /AssistantHub/ paths is accepted', t => {
  const root = fixture(t);
  assert.deepEqual(verifyPagesArtifact(root), { files: 4, offline: true });
});

test('configured backend origin and unresolved Vite meta are blocked', t => {
  for (const origin of ['https://api.example.org', 'http://127.0.0.1:3100',
    '%VITE_ASSISTANTHUB_API_BASE_URL%']) {
    const root = fixture(t, { origin });
    assert.throws(() => verifyPagesArtifact(root), /must not embed an API origin/);
  }
});

test('wrong Pages base path and missing JS/CSS references fail closed', t => {
  const wrong = fixture(t, { path: '/assets/main.js' });
  assert.throws(() => verifyPagesArtifact(wrong), /Unexpected GitHub Pages asset URL/);
  const missing = fixture(t, { path: '/AssistantHub/assets/not-there.js' });
  assert.throws(() => verifyPagesArtifact(missing), /Referenced Pages asset is missing/);
});

test('backend files, source maps, and secret markers are never publishable', t => {
  const root = fixture(t);
  mkdirSync(join(root, 'api'));
  writeFileSync(join(root, 'api', 'config.json'), '{}');
  assert.throws(() => verifyPagesArtifact(root), /Private\/source asset/);
  rmSync(join(root, 'api'), { recursive: true });
  writeFileSync(join(root, 'assets', 'main.js.map'), '{}');
  assert.throws(() => verifyPagesArtifact(root), /Private\/source asset/);
  rmSync(join(root, 'assets', 'main.js.map'));
  writeFileSync(join(root, 'assets', 'main.js'), 'const token = "AUTH_JWT_SECRET"');
  assert.throws(() => verifyPagesArtifact(root), /Private configuration marker/);
});

test('forbids symlinked files and missing index.html', t => {
  const root = fixture(t);
  rmSync(join(root, 'index.html'));
  assert.throws(() => verifyPagesArtifact(root), /index.html is missing/);
});
