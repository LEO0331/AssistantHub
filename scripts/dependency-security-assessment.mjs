import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
const COUNT_KEYS = ['critical', 'high', 'moderate', 'low', 'info', 'total'];

export function extractAudit(audit, label = 'audit') {
  if (!audit || typeof audit !== 'object' || audit.error) {
    throw new Error(label + ': npm registry/audit error or missing audit JSON');
  }
  const counts = audit.metadata?.vulnerabilities;
  if (!counts || !Number.isInteger(counts.total)) {
    throw new Error(label + ': metadata.vulnerabilities missing; do not report an empty scan as clean');
  }
  const vulnerabilities = audit.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== 'object') {
    throw new Error(label + ': vulnerabilities object missing');
  }
  return {
    counts: Object.fromEntries(COUNT_KEYS.map(k => [k, Number(counts[k] || 0)])),
    vulnerabilities
  };
}

export function summarizeAudits(allAudit, prodAudit, lockfile) {
  const all = extractAudit(allAudit, 'all dependencies');
  const production = extractAudit(prodAudit, 'production dependencies');
  const installed = lockfile?.packages;
  if (!installed || typeof installed !== 'object') throw new Error('Invalid package-lock.json packages');
  if (production.counts.total > all.counts.total) throw new Error('Production audit count exceeds full audit; results are inconsistent');

  const prodNames = new Set(Object.keys(production.vulnerabilities));
  const packages = Object.entries(all.vulnerabilities).map(([name, v]) => {
    const occurrences = Object.entries(installed).filter(([path]) =>
      path === 'node_modules/' + name || path.endsWith('/node_modules/' + name)
    );
    const installedVersions = [...new Set(occurrences.map(([, info]) => info.version).filter(Boolean))].sort();
    const advisories = (v.via || []).filter(x => typeof x === 'object' && x !== null)
      .map(x => ({ title: x.title || '', url: x.url || '', range: x.range || '', source: x.source || null }));
    return {
      name,
      severity: v.severity || 'unknown',
      direct: v.isDirect === true,
      productionAuditMatch: prodNames.has(name),
      installedVersions,
      installedOccurrences: occurrences.length,
      lockfileDevOnly: occurrences.length > 0 && occurrences.every(([, info]) => info.dev === true),
      vulnerableRange: v.range ?? '',
      npmFixAvailable: v.fixAvailable ?? false,
      dependents: (v.effects || []).slice(0, 25),
      advisories,
      viaDependencyNames: (v.via || []).filter(x => typeof x === 'string')
    };
  }).sort((a,b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) || a.name.localeCompare(b.name));
  return {
    generatedAt: new Date().toISOString(),
    lockfileVersion: lockfile.lockfileVersion,
    rootPackage: lockfile.name,
    overall: all.counts,
    productionOnly: production.counts,
    packages,
    note: 'npm audit report only; advisory counts, installed occurrences, and npm fixAvailable are different concepts. No fix or exploitability is independently verified.'
  };
}

function runNpmAudit(omitDev = false, cwd = process.cwd()) {
  const args = ['audit', '--json', '--audit-level=low', ...(omitDev ? ['--omit=dev'] : [])];
  const child = spawnSync('npm', args, { cwd, encoding: 'utf8', maxBuffer: 25 * 1024 * 1024, timeout: 180000 });
  if (child.error) throw child.error;
  if (child.status !== 0 && child.status !== 1) {
    throw new Error('npm ' + args.join(' ') + ' failed with status ' + child.status + ': ' + (child.stderr || '').slice(0, 600));
  }
  let value;
  try { value = JSON.parse(child.stdout); }
  catch { throw new Error('npm ' + args.join(' ') + ': invalid audit JSON; do not infer zero vulnerabilities'); }
  if (value.error) throw new Error('npm ' + args.join(' ') + ': registry audit returned an error');
  return value;
}

function escapeCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ').slice(0, 220);
}

export function renderReport(report) {
  const {overall:o, productionOnly:p} = report;
  const lines = [
    '# ' + report.rootPackage + ' dependency security assessment',
    '',
    'Generated: ' + report.generatedAt,
    '',
    '> **Diagnostic report only; a successful reporting job is NOT a passing security gate.** Findings require triage. No package versions were changed.',
    '',
    '| Audit scope | Critical | High | Moderate | Low | Total |',
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    '| All dependencies | ' + [o.critical,o.high,o.moderate,o.low,o.total].join(' | ') + ' |',
    '| Production (--omit=dev) | ' + [p.critical,p.high,p.moderate,p.low,p.total].join(' | ') + ' |',
    '',
    '**Distinct affected npm package names:** ' + report.packages.length + '. This is not the same as the count of advisories or installed package instances.',
    '',
    '| Package | Severity | Direct | Seen in production-only audit | Locked version(s) | Lockfile instances | npm fixAvailable (unverified) |',
    '| --- | --- | --- | --- | --- | ---: | --- |'
  ];
  for (const row of report.packages) {
    const candidate = typeof row.npmFixAvailable === 'object' ? JSON.stringify(row.npmFixAvailable) : String(row.npmFixAvailable);
    lines.push('| ' + [row.name,row.severity,row.direct,row.productionAuditMatch,row.installedVersions.join(', ') || 'not located',row.installedOccurrences,candidate].map(escapeCell).join(' | ') + ' |');
  }
  lines.push('', '## Advisory evidence (npm audit inputs; upstream patch not independently verified)', '');
  for (const item of report.packages) {
    const advisories = item.advisories.filter(x => /^https:\/\//.test(x.url));
    if (!advisories.length) continue;
    lines.push('**' + item.name + '**: ' + advisories.map(a => a.url + (a.range ? ' (range ' + escapeCell(a.range) + ')' : '')).join('; '));
    lines.push('');
  }
  lines.push('### Interpretation',
    '- The production-only audit is a dependency-scope proxy, not proof that a vulnerability is unreachable or exploitable.',
    '- A development dependency can affect CI/build tooling even when it is absent from the deployed browser bundle.',
    '- npm fixAvailable and an increased version number are **not** independent verification of an official upstream fix. Cross-check reviewed advisories, official releases, and functionality before any upgrade.',
    '- This check never runs npm audit fix, alters the lockfile, dismisses alerts, or bypasses existing CI checks.',
    '- Raw machine-readable findings are emitted to the local ignored .security-reports/ directory; the full summary is also available in the GitHub Actions run log and job summary.',
    '');
  return lines.join('\n');
}

function main() {
  // Audit both lockfiles independently; root and api are separate npm trees.
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--api')) {
    throw new Error('Usage: node scripts/dependency-security-assessment.mjs [--api]');
  }
  const api = args[0] === '--api';
  const cwd = resolve(api ? 'api' : '.');
  const lock = JSON.parse(readFileSync(resolve(cwd, 'package-lock.json'), 'utf8'));
  const report = summarizeAudits(runNpmAudit(false, cwd), runNpmAudit(true, cwd), lock);
  const markdown = renderReport(report);
  mkdirSync('.security-reports', { recursive: true });
  const prefix = api ? 'api-dependency-audit' : 'dependency-audit';
  writeFileSync(resolve('.security-reports', prefix + '.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(resolve('.security-reports', prefix + '.md'), markdown);
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  if (report.overall.total > 0) {
    console.log('::warning::Dependency assessment found ' + report.overall.total + ' npm audit findings (' +
      report.overall.high + ' high, ' + report.overall.critical + ' critical). This report job does not certify security.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); }
  catch (error) { console.error('Dependency audit assessment FAILED: ' + error.message); process.exitCode = 1; }
}
