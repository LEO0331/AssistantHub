import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ACTION_SHA = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+@[a-f0-9]{40}$/i;
const USES = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/gm;

export function verifyWorkflowPolicy(name, source) {
  assert.ok(/^\s*permissions:\s*\r?\n\s+contents:\s*read\s*$/m.test(source),
    name + ': workflow must default to contents: read');
  assert.ok(!/^\s*(?:pull_request_target|workflow_run):/m.test(source),
    name + ': privileged trigger requires a separate security review');
  const actions = Array.from(source.matchAll(USES), match => match[1]);
  assert.ok(actions.length > 0, name + ': no GitHub Actions were found');
  for (const ref of actions) {
    assert.ok(ACTION_SHA.test(ref), name + ': action must use a full commit SHA: ' + ref);
  }
  return actions.length;
}

export function verifyRepositoryWorkflows(directory) {
  const paths = readdirSync(directory).filter(path => /\.ya?ml$/i.test(path));
  assert.ok(paths.length >= 5, 'Expected all CI, API, Lighthouse, audit and deploy workflows');
  let count = 0;
  for (const path of paths) {
    count += verifyWorkflowPolicy(path, readFileSync(join(directory, path), 'utf8'));
  }
  const ci = readFileSync(join(directory, 'ci.yml'), 'utf8');
  const deploy = readFileSync(join(directory, 'deploy.yml'), 'utf8');
  const api = readFileSync(join(directory, 'api-ci.yml'), 'utf8');
  for (const [name, source] of [['ci', ci], ['deploy', deploy]]) {
    assert.match(source, /npm audit --omit=dev --audit-level=high/,
      name + ': missing blocking production audit');
    assert.match(source, /npm run test:release/,
      name + ': missing offline release artifact gate');
    assert.match(source, /VITE_ASSISTANTHUB_API_BASE_URL:\s*["']{2}/,
      name + ': Pages-compatible build must explicitly disable API origin');
  }
  assert.match(api, /npm audit --omit=dev --audit-level=high --prefix api/,
    'API blocking production security gate must not be removed');
  return { files: paths.length, actions: count };
}
