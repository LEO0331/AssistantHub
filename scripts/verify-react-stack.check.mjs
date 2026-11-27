import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { verifyReactStack } from './verify-react-stack.mjs';

// Keep negative cases independent of the live lockfile. An incompatible
// dependency update must fail the real-stack test, not poison every fixture.
const manifest = { dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' } };
const lock = { packages: {
  '': { dependencies: { ...manifest.dependencies } },
  'node_modules/react': { version: '18.3.1' },
  'node_modules/react-dom': { version: '18.3.1', peerDependencies: { react: '^18.3.1' } },
  'node_modules/react-leaflet': { version: '4.2.1', peerDependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } },
  'node_modules/@react-leaflet/core': { version: '2.1.0', peerDependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } },
  'node_modules/react-copy-to-clipboard': { version: '5.1.0', peerDependencies: { react: '^15.3.0 || 16 || 17 || 18' } },
} };
const clone = value => structuredClone(value);

test('the checked-in app stack has compatible React 18 runtime and integrations', () => {
  const actualManifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const actualLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const result = verifyReactStack(actualManifest, actualLock);
  assert.match(result.react, /^18\./, 'React major migrations require coordinated review');
  assert.equal(result.react, result.reactDom);
});

test('the isolated supported-stack fixture passes', () => {
  assert.deepEqual(verifyReactStack(manifest, lock), { react: '18.3.1', reactDom: '18.3.1' });
});

test('accepts an inclusive minimum peer range from clipboard 5.1.1', () => {
  const changed = clone(lock);
  changed.packages['node_modules/react-copy-to-clipboard'] = {
    version: '5.1.1', peerDependencies: { react: '>=15.3.0' }
  };
  assert.deepEqual(verifyReactStack(manifest, changed),
    { react: '18.3.1', reactDom: '18.3.1' });
  changed.packages['node_modules/react-copy-to-clipboard'].peerDependencies.react = '>=18.3.1';
  assert.equal(verifyReactStack(manifest, changed).react, '18.3.1');
});

test('rejects a peer minimum above the resolved React version', () => {
  const changed = clone(lock);
  const clipboard = changed.packages['node_modules/react-copy-to-clipboard'];
  for (const range of ['>=18.3.2', '>=18.4.0', '>=19.0.0']) {
    clipboard.peerDependencies.react = range;
    assert.throws(() => verifyReactStack(manifest, changed),
      /react-copy-to-clipboard requires react@/);
  }
});

test('a React 19-only bump is rejected before npm ci', () => {
  const changedManifest = clone(manifest);
  const changedLock = clone(lock);
  changedManifest.dependencies.react = '^19.3.1';
  changedLock.packages[''].dependencies.react = '^19.3.1';
  changedLock.packages['node_modules/react'].version = '19.3.1';
  assert.throws(() => verifyReactStack(changedManifest, changedLock),
    /react and react-dom must resolve to the same version/);
});

test('a React Leaflet 5-only bump is rejected on React 18', () => {
  const changed = clone(lock);
  changed.packages['node_modules/react-leaflet'] = {
    version: '5.0.0', peerDependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' }
  };
  assert.throws(() => verifyReactStack(manifest, changed),
    /react-leaflet requires react@\^19\.0\.0/);
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

test('React 19 and Leaflet 5 still require a compatible clipboard integration', () => {
  const changedManifest = clone(manifest);
  const changed = clone(lock);
  for (const name of ['react', 'react-dom']) {
    changedManifest.dependencies[name] = '^19.3.1';
    changed.packages[''].dependencies[name] = '^19.3.1';
    changed.packages['node_modules/' + name].version = '19.3.1';
  }
  changed.packages['node_modules/react-dom'].peerDependencies.react = '^19.3.1';
  for (const name of ['react-leaflet', '@react-leaflet/core']) {
    changed.packages['node_modules/' + name].peerDependencies = { react: '^19.0.0', 'react-dom': '^19.0.0' };
  }
  assert.throws(() => verifyReactStack(changedManifest, changed),
    /react-copy-to-clipboard requires react@/);
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
