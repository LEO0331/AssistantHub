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

test('API audit report retains production advisories, versions and fix metadata', () => {
  const apiLock = {
    name: 'assistanthub-api', lockfileVersion: 3,
    packages: {
      '': {},
      'node_modules/mysql2': { version: '3.24.6' },
      'node_modules/umzug/node_modules/glob': { version: '10.5.0', dev: true }
    }
  };
  const all = makeAudit({ total: 2, high: 1, moderate: 1 }, {
    mysql2: { severity: 'moderate', isDirect: true, range: '<3.30.0',
      via: [{title:'test issue',url:'https://github.com/advisories/GHSA-fake',range:'<3.30.0'}], fixAvailable: { name:'mysql2',version:'3.30.0' } },
    glob: { severity: 'high', isDirect: false, via: ['minimatch'], fixAvailable:false }
  });
  const prod = makeAudit({ total: 1, moderate: 1 }, { mysql2: all.vulnerabilities.mysql2 });
  const result = summarizeAudits(all, prod, apiLock);
  const text = renderReport(result);
  expectTextIncludes(text, ['assistanthub-api', 'mysql2', '3.24.6', 'GHSA-fake',
    'Production (--omit=dev)', 'glob']);
  assert.equal(result.packages.find(p => p.name === 'mysql2').productionAuditMatch, true);
  assert.equal(result.packages.find(p => p.name === 'glob').lockfileDevOnly, true);
});

function expectTextIncludes(text, tokens) {
  for (const token of tokens) assert.ok(text.includes(token), 'Missing token: ' + token);
}

test('cannot report production count larger than all-dependency count', () => {
  const all = makeAudit({ total: 0 }, {});
  const prod = makeAudit({ total: 1, high: 1 }, {foo:{severity:'high',via:[]}});
  assert.throws(() => summarizeAudits(all, prod, lock), /inconsistent/);
});
