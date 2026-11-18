import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { verifyReactStack } from './verify-react-stack.mjs';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const clone = value => structuredClone(value);

test('the supported React 18 app stack has compatible runtime and integrations', () => {
  assert.deepEqual(verifyReactStack(manifest, lock), {
    react: '18.3.1', reactDom: '18.3.1'
  });
});

test('a React DOM 19-only Dependabot bump is rejected before npm ci', () => {
  const changedManifest = clone(manifest);
  const changedLock = clone(lock);
  changedManifest.dependencies['react-dom'] = '^19.3.1';
  changedLock.packages[''].dependencies['react-dom'] = '^19.3.1';
  changedLock.packages['node_modules/react-dom'].version = '19.3.1';
  assert.throws(() => verifyReactStack(changedManifest, changedLock),
    /react and react-dom must resolve to the same version/);
});

test('upgrading both packages still requires updating React 18-only integrations', () => {
  const changedManifest = clone(manifest);
  const changedLock = clone(lock);
  for (const name of ['react', 'react-dom']) {
    changedManifest.dependencies[name] = '^19.3.1';
    changedLock.packages[''].dependencies[name] = '^19.3.1';
    changedLock.packages['node_modules/' + name].version = '19.3.1';
  }
  changedLock.packages['node_modules/react-dom'].peerDependencies.react = '^19.3.1';
  assert.throws(() => verifyReactStack(changedManifest, changedLock),
    /react-leaflet requires react@\^18\.0\.0/);
});

test('rejects a mismatched manifest and checked-in lockfile', () => {
  const changed = clone(manifest);
  changed.dependencies['react-dom'] = '^19.3.1';
  assert.throws(() => verifyReactStack(changed, lock),
    /react-dom lockfile root does not match package.json/);
});

test('rejects missing or unsupported peer dependency data', () => {
  const changed = clone(lock);
  delete changed.packages['node_modules/react-leaflet'];
  assert.throws(() => verifyReactStack(manifest, changed),
    /Expected installed React integration is missing: react-leaflet/);
  const changed2 = clone(lock);
  changed2.packages['node_modules/react-leaflet'].peerDependencies.react = '>=18 <20';
  assert.throws(() => verifyReactStack(manifest, changed2),
    /react-leaflet requires react@>=18 <20/);
});
