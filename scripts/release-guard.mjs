import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// A deliberately narrow GitHub Pages release check. It is NOT a general
// secret scanner; it rejects known private artifact types and any configured
// backend origin, then enforces valid GitHub Pages asset paths.
const UNSAFE_PATH = /(^|\/)(?:api|node_modules|\.git|\.env(?:\.[^/]*)?|docker-compose\.ya?ml|package-lock\.json|package\.json|\.github|src|scripts)(?:\/|$)/i;
const UNSAFE_FILE = /(?:^|\/)[^/]+\.(?:pem|key|p12|pfx|sql|map|db|sqlite|crt)$/i;
const FORBIDDEN_TEXT = /\b(?:AUTH_JWT_SECRET|BOOTSTRAP_USER_PASSWORD|DB_PASSWORD|MYSQL_ROOT_PASSWORD)\b/;
const META = /<meta\b[^>]*\bname="assistanthub-api-base-url"[^>]*\bcontent="([^"]*)"[^>]*>/i;

export function verifyPagesArtifact(directory) {
  const root = resolve(directory);
  const indexPath = join(root, 'index.html');
  assert.ok(existsSync(indexPath), 'GitHub Pages build/index.html is missing');
  const files = [];
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      const path = relative(root, file).split(sep).join('/');
      assert.ok(!entry.isSymbolicLink(), 'Symlink is forbidden in Pages artifact: ' + path);
      assert.ok(!UNSAFE_PATH.test(path) && !UNSAFE_FILE.test(path),
        'Private/source asset is forbidden in Pages artifact: ' + path);
      if (entry.isDirectory()) {
        walk(file);
        continue;
      }
      assert.ok(entry.isFile(), 'Unexpected filesystem entry: ' + path);
      files.push(path);
      if (/\.(?:html|css|js|json)$/i.test(path)) {
        const content = readFileSync(file, 'utf8');
        assert.ok(!FORBIDDEN_TEXT.test(content), 'Private configuration marker found in Pages artifact: ' + path);
      }
    }
  }
  walk(root);
  const html = readFileSync(indexPath, 'utf8');
  const configured = META.exec(html);
  assert.ok(configured, 'Missing explicit frontend API metadata policy');
  assert.equal(configured[1], '', 'Public Pages build must not embed an API origin');
  assert.ok(!/%(?:VITE_|BASE_URL|PUBLIC_URL)/.test(html), 'Unresolved Vite template variable');
  const paths = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  assert.ok(paths.some(path => path.endsWith('.js')), 'No production JavaScript entry point');
  assert.ok(paths.some(path => path.endsWith('.css')), 'No production stylesheet');
  for (const path of paths) {
    assert.ok(/^\/AssistantHub\/[A-Za-z0-9_./-]+$/.test(path),
      'Unexpected GitHub Pages asset URL: ' + path);
    const subpath = path.slice('/AssistantHub/'.length);
    assert.ok(!subpath.split('/').includes('..'), 'Asset path traversal');
    assert.ok(existsSync(join(root, subpath)) && statSync(join(root, subpath)).isFile(),
      'Referenced Pages asset is missing: ' + path);
  }
  assert.ok(files.includes('manifest.json'), 'Static PWA manifest is missing');
  return { files: files.length, offline: true };
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const result = verifyPagesArtifact(process.argv[2] || 'build');
    console.log('GitHub Pages release guard passed: ' + result.files + ' offline-only assets');
  } catch (error) {
    console.error('GitHub Pages release guard failed: ' + error.message);
    process.exitCode = 1;
  }
}
