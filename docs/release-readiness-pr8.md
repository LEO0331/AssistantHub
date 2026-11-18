# AssistantHub 2.0 — PR #8 final release and security decision

**Post-merge verification (November 18, 2026):** PR #30 (milestone #8), PR #39 (offline status UI cleanup) and PR #37 (React peer compatibility) are all **merged**. The [main-branch deployment after PR #37](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263) completed successfully, publishing the **static offline Pages artifact**. **GO** for this reviewed offline GitHub Pages demo; **NO-GO** for public hosting of the authenticated Express/MySQL API, real candidate data, or shared writable accounts. No public backend has been launched. See the [verified current-state page](current-state.md) for source-of-truth details.

The project has an interview-ready **local synthetic-data full-stack workflow**, not a production multi-tenant hiring system. Its React runtime remains **React/React DOM 18.3.1** after the [PR #37 compatibility resolution](react-dependency-policy.md), and the [PR #39 offline UI fix](current-state.md) does not alter the MySQL API. A passing CI gate is evidence for tested properties, **not a blanket security certification**.

## What can be safely released

| Surface | Decision | Implemented enforcement |
| --- | --- | --- |
| Public React/Vite GitHub Pages, local/mock demo | **GO, currently deployed offline-only** | Offline-only compiled artifact gate, exact /AssistantHub/ asset paths, browser build tests, Lighthouse and production dependency high/critical gate |
| Local Express/MySQL with synthetic seeds and privately provisioned accounts | **GO for isolated local demo** | API_HOST loopback-only, JWT/RBAC, 4 KB JSON limit, CORS exact origin, MySQL transactions/audit, durable idempotency |
| Public authenticated API, real candidate records or external shared Recruiter account | **NO-GO** | Blocked by loopback-only API_HOST; additional architecture and controls below required |
| Banking/financial production workload | **NO-GO** | Requires regulated data governance, formal threat model/pen test, tenant isolation, secrets/incident operations, audit retention, formal controls |

This PR makes public API binding **fail closed**: serverConfig accepts only API_HOST 127.0.0.1, ::1 or localhost. Do not remove the guard simply to create a public demo; build a separate reviewed deployment PR with explicit per-user isolated data, HTTPS and infrastructure protections.

## Tests and hardening added

- Backend sends Cache-Control: no-store **even on malformed/oversized JSON errors**, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: no-referrer, a deny-by-default API CSP, and a restrictive Permissions-Policy. HTTP tests assert these headers and reject external API_HOST settings. CORS and JWT checks remain separate controls.
- The Pages build is forced to an empty VITE_ASSISTANTHUB_API_BASE_URL in validation and deployment. The Node release guard verifies that final build/index.html does **not** contain an API origin (or unresolved Vite template), referenced JS/CSS/manifest paths remain under /AssistantHub/, and build/ has no private/source paths, sourcemaps, symlinks or known server-secret variable markers. It is an **artifact check, not an exhaustive secret scanner**.
- GitHub Actions dependencies pinned to full commit SHAs; a merged update subsequently moved some action pins to newer verified SHA refs; CI/Lighthouse have explicit read-only token permissions; only the Pages deployment job retains pages:write and id-token:write. A native test scans workflows to fail if a new mutable action tag, privileged trigger or missing mandatory audit/deploy check appears.
- Root Pages CI **and the actual deployment workflow** run npm audit --omit=dev --audit-level=high. API CI retains npm audit --omit=dev --audit-level=high --prefix api, along with migrations twice, synthetic seeds twice and real-MySQL auth/RBAC/concurrency/rollback/idempotency tests.
- Weekly Dependabot updates for root npm, api npm and GitHub Actions create independent reviewable PRs. These are **not** automatic remediations or proof that all vulnerabilities are fixed.

## Safe local full-stack demonstration

Use only a developer/test workstation with Docker, Node meeting the repository engine requirements, and no real applicant information.

1. Create a private local api/.env based on api/.env.example. Generate a random AUTH_JWT_SECRET separately; never reuse CI/example credentials for a real deployment. API_HOST must remain 127.0.0.1 and DB_HOST/DB_PORT must refer to your local development MySQL.
2. Run docker compose up -d mysql; npm ci --prefix api; npm run db:migrate --prefix api; npm run db:seed --prefix api. Migration history must be inspected if MySQL DDL is interrupted; do not auto-drop tables or run sequelize.sync({alter:true}).
3. Provision each test-only Viewer/Recruiter/Admin account explicitly with npm run user:provision --prefix api and password environment values from a private terminal, as described in docs/security-auth-pr4.md. **No public default user is seeded.**
4. Run npm start --prefix api (loopback-only) and verify /api/health/live and /api/health/ready. Confirm ready is 200; note it checks connectivity, **not migration completeness**.
5. For the local browser, run VITE_ASSISTANTHUB_API_BASE_URL=http://127.0.0.1:3100 npm start; select **Real MySQL API**, sign in and use synthetic hiring workflow. Viewer reads; Recruiter/Admin transition. Repeated same-key requests replay a committed status/audit operation.
6. To verify a **public-static artifact** without publishing anything, run the following at repository root:

    npm ci
    npm run lint
    npm run test:ci
    VITE_ASSISTANTHUB_API_BASE_URL="" npm run build
    npm run test:tooling
    npm run test:release
    npm audit --omit=dev --audit-level=high

The API runtime is never bundled into build/. The public browser defaults to the offline local/mock demo. Do not put DB_PASSWORD, AUTH_JWT_SECRET, user passwords, or any privileged token into VITE_* variables or GitHub Pages repository variables.

## Post-merge release verification checklist (rerun after future changes)

- [x] PR #30 was reviewed and merged; the API_HOST guard, headers, Pages release guard, action pins, tests and Dependabot configuration are present on `main` as of this snapshot.
- [x] PR #30's final API CI, frontend CI, Lighthouse and dependency-assessment checks passed at merge. **For new changes, recheck their own latest run** rather than relying on these historical statuses.
- [ ] Verify branch protection and required status checks in GitHub repository settings; these settings cannot be established by merely committing this PR. Require review for security-sensitive workflow changes if available.
- [ ] Confirm GitHub Pages Source is GitHub Actions under Settings → Pages; this repository's workflow does not mutate that setting. On merge to main, its read-only build job enforces offline-only release checks before Pages artifact upload.
- [x] The [PR #37 merge deployment](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263) completed build + deploy. Manual per-browser smoke testing is a **separate step**, not evidenced by CI alone. Unavailable API mode is intentional on public Pages.
- [ ] Do not configure public database credentials, an API_HOST of 0.0.0.0, a shared public Admin account, or real candidate PII as part of this release.

### Rollback / incident response

If a Pages release fails its new audit/asset checks, investigate the cause; **do not bypass the gates**. If the deployed offline demo malfunctions, revert the triggering commit/PR on main and let the existing Pages workflow publish the last good static build; preserve old verified artifacts where possible.

For a suspected backend credential leak, stop exposing the affected host, rotate JWT signing secrets and database credentials, disable affected accounts, inspect sanitized request metadata/audit history, and treat active JWTs as valid until expiry unless the account is disabled. Avoid publishing logs or candidate information in a public issue.

For backend operation recovery, consult docs/idempotency-pr7.md. Losing an HTTP response after commit does not create a second application transition if the same actor/key/payload is replayed while the record remains retained. **Do not truncate the idempotency_records table on rollback**. Back up database rows before nonreversible schema work and rehearse restore before a public launch.

## Explicit residual risks / public API prerequisites

| Open item | Current state | Required before public API |
| --- | --- | --- |
| npm advisories | **Dated November 18 audit snapshot**, not a continuously updated count: root full audit 43 affected package names (39 high, 4 moderate), API full audit six (4 high, 2 moderate), including two moderate API production findings. Root production audit was 0 at PR #37 CI | Re-assess all current GHSA findings; patch with separate reviewed compatibility PRs; do not use npm audit fix --force blindly |
| JWT lifecycle | 15-minute JWT, user/role checked against DB, no refresh or denylist | Key rotation, logout/revocation design, monitored auth abuse |
| Login abuse | IP limit tracked in process memory | Centralized per-user/IP limiter, trusted reverse-proxy policy, monitoring and DDoS protections |
| Multi-tenant authorization | Global synthetic candidate ID visibility to authenticated users | Tenant/job ownership scopes, field-level RBAC, data minimization/PII safeguards |
| Database & audit | MySQL atomic status/audit, append-only via API only | Least-privilege DB grants, migration backups, recovery drills, retention enforcement and external tamper-evident audit transport |
| Public backend hosting | **Not deployed, forced loopback** | Separately reviewed HTTPS reverse-proxy architecture, network/DB isolation, secure headers and CORS, operational secrets manager |
| Web XSS/CSP | In-memory bearer token; server JSON API CSP only | Review client-side injection paths and adopt tested CSP/security headers on the real hosting layer; a public Pages HTML CSP is not set by this PR |
| Business side effects | Transactional DB writes only | Outbox/inbox when connecting email/payment/external systems, retry queues, alerting and sagas where needed |
| Detection and incidents | Sanitized structured logs, no hosted sink | Centralized monitored logs, retention, alert thresholds, incident escalation and secrets scanning |

**Dependency-alert interpretation:** A green blocking audit means no reported findings **at or above the configured threshold** in that scoped dependency set, not zero vulnerabilities. The report-only full dependency workflow continues to surface development findings separately. Never dismiss a warning merely to make the dashboard green.

For a résumé/interview demonstration, you can accurately claim: a locally runnable Node/Express/MySQL hiring backend with JWT/RBAC, transactionally persisted status and audit, database-enforced optimistic concurrency, actor-scoped idempotent replay, CI that exercises real MySQL, and an offline-safe GitHub Pages demo. You should not claim a deployed production backend, fully clean dependencies, or banking-grade controls.

