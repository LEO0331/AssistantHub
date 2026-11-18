import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractAudit, summarizeAudits, renderReport } from './dependency-security-assessment.mjs';

const lock = { name: 'demo', lockfileVersion: 3, packages: {
  '': {},
  'node_modules/foo': { version: '1.0.0', dev: true },
  'node_modules/bar': { version: '2.0.0' },
  'node_modules/tool/node_modules/foo': { version: '1.0.0', dev: true }
}};
const makeAudit = (counts, vulnerabilities) => ({ metadata: { vulnerabilities: counts }, vulnerabilities });

test('missing metadata or registry error fails closed', () => {
  assert.throws(() => extractAudit({}, 'test'), /missing/);
  assert.throws(() => extractAudit({ error: { message: 'unavailable' } }, 'test'), /error/);
});

test('production and development-only findings are distinguished, without claiming patches', () => {
  const all = makeAudit({ total: 2, high: 1, moderate: 1 }, {
    foo: { severity: 'high', isDirect: false, range: '<=1.0.0', via: [{title:'ReDoS',url:'https://github.com/advisories/GHSA-test',range:'<=1.0.0'}], fixAvailable:false },
    bar: { severity: 'moderate', isDirect: true, via: ['foo'], fixAvailable:true }
  });
  const prod = makeAudit({ total: 1, moderate: 1 }, { bar: {severity:'moderate',via:[]} });
  const report = summarizeAudits(all, prod, lock);
  assert.equal(report.overall.total, 2);
  assert.equal(report.productionOnly.total, 1);
  assert.equal(report.packages[0].name, 'foo');
  assert.equal(report.packages[0].productionAuditMatch, false);
  assert.equal(report.packages[0].installedOccurrences, 2);
  assert.equal(report.packages[0].lockfileDevOnly, true);
  assert.equal(report.packages[1].productionAuditMatch, true);
  assert.match(renderReport(report), /NOT a passing security gate/);
  assert.match(renderReport(report), /GHSA-test/);
});

test('cannot report production count larger than all-dependency count', () => {
  const all = makeAudit({ total: 0 }, {});
  const prod = makeAudit({ total: 1, high: 1 }, {foo:{severity:'high',via:[]}});
  assert.throws(() => summarizeAudits(all, prod, lock), /inconsistent/);
});
