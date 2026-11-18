import assert from 'node:assert/strict';
import { test } from 'node:test';
import { verifyWorkflowPolicy, verifyRepositoryWorkflows } from './workflow-policy.mjs';

const PIN = '11bd71901bbe5b1630ceea73d27597364c9af683';
const valid = 'name: Check\npermissions:\n  contents: read\njobs:\n  check:\n    steps:\n      - uses: actions/checkout@' + PIN + '\n';

test('every repository workflow uses full immutable action commits and least privilege', () => {
  const result = verifyRepositoryWorkflows('.github/workflows');
  assert.ok(result.files >= 5);
  assert.ok(result.actions >= 10);
});

test('accepts verified sha-pinned action and read-only workflow token', () => {
  assert.equal(verifyWorkflowPolicy('test', valid), 1);
});

test('rejects mutable GitHub Actions tags and unbounded token privileges', () => {
  assert.throws(
    () => verifyWorkflowPolicy('tag', valid.replace(PIN, 'v4')),
    /full commit SHA/
  );
  assert.throws(
    () => verifyWorkflowPolicy('write', valid.replace('contents: read', 'contents: write')),
    /contents: read/
  );
});

test('rejects privileged PR triggers without a dedicated review', () => {
  assert.throws(
    () => verifyWorkflowPolicy('privileged', valid + 'pull_request_target:\n  branches: [main]\n'),
    /privileged trigger/
  );
});
