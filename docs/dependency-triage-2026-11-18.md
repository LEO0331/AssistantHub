# Dependency triage — AssistantHub / API (November 18, 2026)

**Assessment:** [PR #43 report-only GitHub Actions run](https://github.com/LEO0331/AssistantHub/actions/runs/44257018687), based on the two committed npm lockfiles. The GitHub advisory pages cited below were checked on the same date. **The PR does not upgrade or dismiss dependencies**, and a green report-only job does not mean the advisories are fixed.

## Current inventory

| Npm dependency tree | Full audit | Production-only `--omit=dev` | Priority |
| --- | --- | --- | --- |
| Frontend `package-lock.json` | 43 affected package names: **39 high, 4 moderate**, no critical | **0** | Monitor/repair build-time tooling after verifying compatible releases |
| API `api/package-lock.json` | 6 affected names: **4 high, 2 moderate**, no critical | **2 moderate** (`sequelize`, `uuid`) | Investigate runtime advisory and Sequelize's transitive dependency first |

The numbers count **affected package names**, not distinct security advisories and not copies installed in `node_modules`. Production-only scope reduces exposure but is not proof of safety.

## Triage by root cause

| Issue | Locked evidence and scope | Advisory / patched-version evidence | Remediation decision |
| --- | --- | --- | --- |
| **High: picomatch ReDoS** | Frontend `picomatch` v4.0.7 (23 nested instances) and v2.3.2 (1); API dev tooling `picomatch` v4.0.7. Direct parent packages include Jest/Vite and API migration tool Umzug. | [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf): affected through 4.0.7; **no patched version listed** on Nov 18. | **Not safely remediable by a known upstream patched pin.** Do not use `npm audit fix --force`, speculative `picomatch@4.0.8` or downgrade modern Jest/Vite/Umzug. Continue using fixed CI timeouts and avoid untrusted glob patterns. Track upstream changes. |
| **Moderate: glob abort traversal** | Frontend dev dependencies include `glob` v10.5.0, v13.0.6; a v7.2.3 copy is outside the specific advisory range. | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4): affected 9.0.0–14.0.1; patched **14.0.2**. | **Separate reviewed major-version migration** via Jest/test-exclude upstream; avoid forcing glob 14 over incompatible major peer/behavior contracts. Check whole lockfile and Jest regression tests first. |
| **Moderate: minimatch globparts amplification** | Frontend dev dependency `minimatch` v9.0.9 and v10.2.6 (v3.1.5 also installed but outside this exact GHSA's stated affected range). | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): affected >=7 and <11.0.1; patched **11.0.1**. | **Separate reviewed major-version migration** via parents; no blanket nested override to v11. |
| **Moderate: uuid output-buffer bounds** | API runtime `uuid` **8.3.2**, transitive through `sequelize` **6.37.8**; both are named by npm production audit. | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq): missing provided-output-buffer bounds validation for `uuid.v3/v5/v6`; patched in **11.1.1**, **12.0.1**, **13.0.1**. | **First runtime triage task.** Inspect whether Sequelize/runtime code can call vulnerable functions with untrusted buffers; do not infer exploitation merely from the alert. Upgrading `uuid` 8→11 underneath Sequelize 6 may be incompatible and must not be forced blindly. npm suggests a `sequelize@3.30.0` downgrade, which is **not an acceptable remediation**. Consider tested ORM migration or a narrow, reviewed compatible replacement. |

### Why no package-version change in this PR?

- React 18/React DOM 18 and React Leaflet 4.x have previously had real npm peer conflicts. Unrelated automatic upgrades risk breaking the deployed UI.
- The **high** alert lacks a verified patched upstream version. An arbitrary version or a forced resolver change would provide false assurance.
- The remaining versions require major changes to Jest tooling or a **transitive Sequelize dependency**, which should be made as dedicated migration PRs with full CI and real-MySQL tests.
- API's two moderate findings are **not suppressed** and remain visible; existing production high/critical audit gates still pass.

## Automated reproducible triage

The `.github/workflows/dependency-security-assessment.yml` report-only job now invokes:

```sh
node --test scripts/dependency-security-assessment.check.mjs
node scripts/dependency-security-assessment.mjs
node scripts/dependency-security-assessment.mjs --api
```

Both paths use independent committed `package-lock.json` snapshots; each npm audit runs **full** and `--omit=dev` scope. Output is:
- `.security-reports/dependency-audit.json` / `.md` for root;
- `.security-reports/api-dependency-audit.json` / `.md` for API;
- GitHub Actions step logs and job summaries listing installed versions, package names, advisory links, reported severity, direct/transitive classification and unverified npm-suggested fixes.

The reports are generated at runtime and ignored in Git; do not commit ephemeral `npm audit` outputs. The workflow fails on missing/invalid registry audit metadata rather than claiming zero vulnerabilities.

## Recommended next changes (separate PRs)

1. **API runtime (highest actionable):** trace Sequelize's use of `uuid@8.3.2`, test whether GHSA-w5hq-g745-h8pq's vulnerable buffered v3/v5/v6 API is reachable, and propose a compatibility-tested upgrade/ORM replacement if necessary.
2. **Frontend build-tool advisories:** monitor picomatch for a verified fix; upgrade Jest/build parents to supported glob/minimatch majors rather than overriding all nested copies.
3. **Review governance:** ensure Dependabot security alerts, secret scanning and required status checks/branch rulesets are enabled where the repository plan supports them.
4. **Maintain gates:** keep strict `npm ci`, React compatibility tests, frontend/App tests, MySQL API tests, Pages artifact guard and report-only full audits. Do not waive findings to make CI green.

**Deployment boundary:** the public site is static and synthetic-only; the Express/MySQL backend remains loopback-only. No audit result authorizes hosting a public API or real candidate information. See [security review](security-review-2026-11-18.md).
