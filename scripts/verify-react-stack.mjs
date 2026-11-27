import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function stableVersion(value, name) {
  assert.match(value || '', /^\d+\.\d+\.\d+$/,
    name + ' must resolve to a stable semantic version');
  return value.split('.').map(Number);
}

// Only the simple peer ranges currently used by this project are accepted.
// Fail closed when a new range appears; npm ci still performs full semver
// resolution independently. This guard provides an actionable preinstall error.
function acceptsPeer(range, version) {
  if (range === '*') return true;
  return String(range || '').split('||').some(alternative => {
    const entry = alternative.trim();
    // A standalone inclusive minimum has no upper bound.
    const lowerBound = /^>=\s*(\d+)\.(\d+)\.(\d+)$/.exec(entry);
    if (lowerBound) {
      const minimum = lowerBound.slice(1).map(Number);
      for (let index = 0; index < 3; index += 1) {
        if (version[index] > minimum[index]) return true;
        if (version[index] < minimum[index]) return false;
      }
      return true;
    }
    const match = /^(\^|~)?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(entry);
    if (!match) return false;
    const [, operator, major, minor, patch] = match;
    if (Number(major) !== version[0]) return false;
    if (operator === '~' && minor !== undefined && Number(minor) !== version[1]) return false;
    if (!operator && minor !== undefined && Number(minor) !== version[1]) return false;
    if (!operator && patch !== undefined && Number(patch) !== version[2]) return false;
    if (operator) {
      const minimum = [Number(major), Number(minor || 0), Number(patch || 0)];
      for (let index = 0; index < 3; index += 1) {
        if (version[index] > minimum[index]) return true;
        if (version[index] < minimum[index]) return false;
      }
    }
    return true;
  });
}

export function verifyReactStack(manifest, lock) {
  assert.ok(manifest?.dependencies && lock?.packages?.[''],
    'React stack requires a package.json and a v3 package-lock.json');
  const resolved = {};
  for (const name of ['react', 'react-dom']) {
    const declared = manifest.dependencies[name];
    const locked = lock.packages[''].dependencies?.[name];
    assert.equal(locked, declared, name + ' lockfile root does not match package.json');
    const packageInfo = lock.packages['node_modules/' + name];
    assert.ok(packageInfo, name + ' is absent from the lockfile');
    resolved[name] = stableVersion(packageInfo.version, name);
    assert.ok(acceptsPeer(declared, resolved[name]),
      name + ' installed version is outside the manifest version range');
  }
  assert.deepEqual(resolved.react, resolved['react-dom'],
    'react and react-dom must resolve to the same version. Upgrade them together with compatible integrations.');

  const peers = [
    'react-dom',
    'react-leaflet',
    'react-copy-to-clipboard',
    '@react-leaflet/core'
  ];
  const versions = [
    ['react', resolved.react],
    ['react-dom', resolved['react-dom']]
  ];
  for (const packageName of peers) {
    const direct = lock.packages['node_modules/' + packageName];
    const nested = lock.packages['node_modules/react-leaflet/node_modules/' + packageName];
    const info = direct || nested;
    assert.ok(info, 'Expected installed React integration is missing: ' + packageName);
    for (const [dependency, version] of versions) {
      const range = info.peerDependencies?.[dependency];
      if (range === undefined) continue;
      assert.ok(acceptsPeer(range, version),
        packageName + ' requires ' + dependency + '@' + range +
        ', but the lockfile resolves ' + version.join('.') +
        '. Upgrade the integration package before migrating React majors.');
    }
  }
  return { react: resolved.react.join('.'), reactDom: resolved['react-dom'].join('.') };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    const result = verifyReactStack(manifest, lock);
    console.log('React dependency compatibility passed: react@' +
      result.react + ' and react-dom@' + result.reactDom);
  } catch (error) {
    console.error('React dependency compatibility failed: ' + error.message);
    process.exitCode = 1;
  }
}
