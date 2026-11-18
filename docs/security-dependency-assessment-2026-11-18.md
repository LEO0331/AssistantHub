# Dependency security assessment — November 18, 2026

> **Assessment, not remediation.** This document covers the lockfile and npm audit evidence on AssistantHub main following PR #22. It does not assert that dependencies are safe, and it makes no claim that an upstream fix exists without independent verification.

## Evidence and confirmed facts

- Baseline main: `081821488d9e40522366d06322bd15419f8a1f45` (PR #22 merge).
- Lockfile: npm lockfile v3, `package-lock.json` blob `b2a492835f2892dac9aa81185e769b6289a7d5d0`.
- [PR #22 CI installation log](https://github.com/LEO0331/AssistantHub/actions/runs/44218755753): `npm ci` reports **43 vulnerabilities (39 high, 4 moderate)**. The count alone does not establish 43 distinct advisories.
- All 105 Jest tests and tooling smoke tests passed on PR #22. Those results are **functional**, not evidence of a clean dependency audit.
- `docs/dependabot-review.md` recorded zero vulnerabilities on **October 5**, prior to newer advisories. Treat it as a dated historical review, not the current security posture.
- There is no `.github/dependabot.yml` in the checked baseline; automatic Dependabot security-update availability is repository-setting dependent and was not independently verified by this inspection.
- The existing CI workflow does not call `npm audit`; the new workflow is **diagnostic/report-only**. A green report-generation check means the assessment completed, **not** that the lockfile passed a security gate.

## Live audit results (PR #23 diagnostic workflow)

The [GitHub Actions assessment run](https://github.com/LEO0331/AssistantHub/actions/runs/44224628029) completed successfully against this unchanged dependency lockfile on November 18, 2026:

| Scope | Critical | High | Moderate | Low | Total affected package names |
| --- | ---: | ---: | ---: | ---: | ---: |
| `npm audit --json --audit-level=low` | 0 | 39 | 4 | 0 | 43 |
| `npm audit --json --audit-level=low --omit=dev` | 0 | 0 | 0 | 0 | 0 |

**Interpretation:** The 43 entries are npm audit's affected package names, mostly transitive Jest/Vite dependents—not 43 independent security advisories. The audit's advisory link inventory contains **three distinct GHSA identifiers**. The production-only result indicates no npm-reported vulnerable dependencies when omitting dev dependencies; it does not establish that the deployed application and its build pipeline have no security risk.

### Root-cause advisory inventory

| Root package | Locked instances / versions | Reviewed GitHub advisory | Patched-version field | Scope |
| --- | --- | --- | --- | --- |
| `picomatch` | 24 instances: 23 × `4.0.7`, 1 × `2.3.2` | [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) — High, CVE-2026-112366 | **None** (as of Nov 18) | Dev only |
| `glob` | 10 instances; affected `10.5.0`, `13.0.6` (unaffected `7.2.3` also present) | [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) — Moderate, CVE-2026-118773 | **14.0.2** | Dev only |
| `minimatch` | 14 instances; affected `9.0.9`, `10.2.6` (unaffected `3.1.5` also present for this GHSA) | [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) — Moderate, CVE-2026-118764 | **11.0.1** | Dev only |

The official GitHub-reviewed pages were checked on November 18, 2026. The patched-version fields for glob/minimatch are **advisory claims**, not a claim that this PR independently verified their npm registry release integrity or install compatibility.

### Remediation feasibility and constraints

- **Priority 1: picomatch** — no patched version is identified in the reviewed advisory. Do not imply `4.0.7` is patched and do not install an unverified fork, an arbitrary higher number, or a prerelease as a "fix." No safe upstream upgrade can be claimed today. Monitor upstream advisory and release evidence.
- **Priority 2: glob/minimatch** — GitHub-reviewed advisories identify a patched major release, but the current versions are transitive under Jest and related tooling. Any changes must be evaluated with the existing real installation graph and tests in a **separate, scoped PR**. In particular, avoid blindly overriding every nested major version.
- **Do not follow `npm audit fix --force` suggestions without investigation.** The npm report includes suggestions that would downgrade `jest` to `26.6.3` or `vite` to `6.2.7`; these are not evidence of an upstream `picomatch` fix and could regress the existing application/toolchain.
- Production risk is currently lower than an unqualified "43 high issues" reading suggests, but build/CI availability risks remain. Require provenance and execution-path review before calling a reported finding non-exploitable.
- An explicit, separately reviewed blocking audit gate can be proposed after classification and feasible remediation; a reporting job that finishes green is **not** a security policy pass.

## Immediate area to triage: picomatch (development-tooling)

The checked `package-lock.json` contains **24 occurrences** of picomatch: 23 at version `4.0.7` and one at version `2.3.2`, all marked `dev: true` in the lockfile. They appear under Jest/Vite and related toolchain paths, not as top-level production dependencies.

Check [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) (CVE-2026-112366) for its reviewed/unreviewed status, affected ranges and patched-version field **before** proposing a fix. If no verified official upstream release exists, do not use an arbitrary higher version, unverified fork, unreviewed preprint, or insecure override to claim remediation. The presence of a dev dependency does not eliminate build/CI risk.

## Reproducible assessment included in this PR

A separate GitHub Actions `Dependency security assessment (report only)` workflow runs:
1. `npm ci --ignore-scripts` from the existing, unchanged lockfile.
2. `node --test scripts/dependency-security-assessment.check.mjs` to exercise failure handling and classification.
3. `node scripts/dependency-security-assessment.mjs`, which runs `npm audit --json --audit-level=low` for all dependencies and `npm audit --json --audit-level=low --omit=dev` for production scope.

The script classifies named packages, installed versions and occurrence counts, direct vs transitive dependencies, whether a package appears in the production-only audit, available advisory links, and npm-suggested fixes. It fails on audit retrieval/parsing errors instead of presenting unknown findings as zero. It writes JSON/Markdown into an ignored local `.security-reports/` folder and prints the Markdown to Actions logs and job summary.

The report-only job returns success when it **reliably generates findings**, even if vulnerabilities exist. It is not a replacement for a future **blocking security gate**; the existing CI, coverage, tooling checks and Pages deployment policies are unchanged.

## Triage method and priorities

1. Obtain both scope counts from the new Actions assessment and record the specific affected package/advisory combinations. Do not confuse advisory count, affected package names, or installed lockfile occurrences.
2. Prioritize vulnerabilities present in the `--omit=dev` report. Validate whether the vulnerable component is shipped to the browser; do not assume automatic exploitability solely from an audit classification.
3. Review high-severity dev-only issues next: untrusted file processing in CI, glob/path matching, build-time tooling, and malicious/expensive patterns passed from untrusted inputs.
4. For each remediation candidate, verify official GitHub-reviewed advisory information and the genuine published npm package release. Document any no-fix upstream blockers and practical mitigations.
5. Make package upgrades only in **separate** bounded PRs, with `npm ci`, lint, all 105+ tests, build, tooling smoke test, and Lighthouse where applicable. Do not run `npm audit fix --force`, auto-merge, dismiss alerts, or weaken security checks.
6. If a credible patched upstream version is unavailable, record the risk and review date without calling the vulnerability fixed. Consider minimizing attack surface or replacing vulnerable tooling only after regression evaluation.

## Scope and follow-up

This PR makes **no** changes to package.json, package-lock.json, application source, existing CI/deploy workflows, GitHub Pages settings, or vulnerability alert state. It creates evidence and a repeatable, read-only method. Follow-up remediation work must be scoped to verified upstream patches or defensible architecture changes.

The audit workflow may be rerun manually as advisories evolve; review the job summary rather than treating a green diagnostic badge as a security clearance.
