# AssistantHub 2.0 — architecture (implemented local MVP)

**Current as of November 18, 2026**, after PRs #1–#8 and the merged PR #39 (offline UI) and PR #37 (React dependency compatibility). This page supersedes the earlier implementation proposal. For the precise release and threat boundaries, read [current implementation status](current-state.md) and [release-readiness decision](release-readiness-pr8.md).

## 1. Purpose and execution boundaries

AssistantHub demonstrates two related but **noninterchangeable** systems:

1. **Public GitHub Pages:** an offline React/Vite talent-pool portfolio demo. `local` and `mock-api` modes generate data **inside the browser**; the mock adapter introduces a delay but makes no HTTP request. Shortlisting and the local hire-status pipeline are browser-managed and not subject to JWT authorization.
2. **Optional local full-stack demo:** the same frontend can switch to a configured `api` mode, sign in with an operator-provisioned account and access **synthetic-only** hiring data backed by Express, Sequelize and MySQL. It is **not publicly hosted**. `API_HOST` is restricted to loopback; GitHub Pages' production bundle contains no API origin.

```text
Public: GitHub Pages /AssistantHub/ (React/Vite, build/)
  ├── local + mock-api → in-browser faker generator, search, shortlist/status
  └── api mode is disabled when no API origin is configured

Private local workstation only:
React/Vite :3000 — Bearer JWT over loopback → Express /api :3100
                                                ├── auth, login limiter, RBAC
                                                ├── candidate search + application lookup
                                                ├── versioned hiring workflow service
                                                ├── audit-history API
                                                ├── actor-scoped idempotency + correlation logs
                                                └── Sequelize → MySQL 8.4
                                                    ├── users
                                                    ├── candidates
                                                    ├── applications
                                                    ├── audit_events
                                                    └── idempotency_records
```

There is **no** deployed public API, production tenant isolation, shared writable demo identity or real applicant PII. The API mode requires explicitly configured `VITE_ASSISTANTHUB_API_BASE_URL` for local use and an exact `API_CORS_ORIGIN`.

## 2. Implemented modules

| Location | Responsibility |
| --- | --- |
| `src/App.jsx`, `src/features/*`, `src/state/uiReducer.js` | Offline controls, candidate UI, local shortlist, detail drawer and conditional authenticated API browser |
| `src/services/talentAdapter.js`, `src/data/assistantFactory.js` | Deterministic `local` data generation and delayed `mock-api` simulation, not a network service |
| `src/services/candidateApi.js`, `src/services/workflowApi.js` | Authenticated HTTP candidate/workflow clients with server response validation, cancellation and explicit retry semantics |
| `api/src/app.mjs`, `api/src/routes/*`, `api/src/auth/*` | Express HTTP boundary, 4 KB JSON limits, exact-origin CORS, JWT authentication, current-account role enforcement |
| `api/src/services/workflowService.mjs` | Server-owned transition state machine, conditional SQL update, transactional audit and actor-scoped idempotent replay |
| `api/src/db/*`, `api/migrations/*` | Sequelize models, additive schema migrations and deterministic synthetic seed |
| `api/src/observability/requestObserver.mjs` | Allowlisted structured request metadata, server-generated correlation IDs (no raw URL/body/token logging) |
| `.github/workflows/*`, `scripts/release-guard.mjs`, `scripts/verify-react-stack.mjs` | Strict npm and security audits, React-peer compatibility, offline Pages release checks, real-MySQL API CI and Lighthouse |

## 3. Domain model and authorization

| Table | Important fields and constraints |
| --- | --- |
| `users` | UUID, normalized unique email, scrypt password hash, role (`viewer`, `recruiter`, `admin`), active flag |
| `candidates` | UUID, synthetic name/role/skills/availability/hourly rate |
| `applications` | UUID, unique candidate ID, status, integer `version` (optimistic concurrency) |
| `audit_events` | Event UUID, application/actor IDs, prior/new status, reason, server request ID and timestamp |
| `idempotency_records` | Unique (`actor_id`, `idempotency_key`), canonical SHA-256 request hash, application ID, original response JSON and retention metadata |

The API **authenticates and authorizes every request**; the UI hiding a button is not a permission check. Viewer can read synthetic candidate/application/audit data; Recruiter and Admin may change hiring status. Only Admin may read aggregated account counts. Login returns a 15-minute JWT; the server rechecks user activation and current role on protected calls. There is **no per-record/tenant ownership authorization**, so no real candidate data may be added.

The server-enforced state machine is:

```text
New ──→ Contacted ──→ Interview ──→ Hired (terminal)
 │           │             │
 └──→ Rejected (terminal) ←─┴─────────
```

Specifically, `Rejected` is permitted from `New`, `Contacted` or `Interview`. `Hired` and `Rejected` cannot transition further. A write supplies `expectedVersion`; a conditional MySQL update protects against concurrent changes. The **status update, audit insertion and idempotency response record** share a transaction. A stale request fails with 409; an invalid transition fails with 422; an audit insertion failure rolls back the write. Authenticated audit reads are paginated.

On ambiguous HTTP outcomes, a client may **explicitly retry the same UUID-v4 idempotency key and identical payload** while the record is retained. The database replays the original committed response, not a duplicate transition. Seven-day idempotency expiry is operator-pruned; the browser's pending key exists only in component memory. See [PR #7 idempotency and recovery](idempotency-pr7.md) for caveats.

**The offline demo is different:** its own linear `New → Contacted → Interview → Hired` pipeline has no `Rejected` or audit events. In the merged PR #39 UI, advancing an unshortlisted candidate directly from the offline detail drawer also shortlists them; `Hired` stays final. This must not be described as an API-authorized business transaction.

## 4. Release, operations and verification

- The public `/AssistantHub/` site is built with `VITE_ASSISTANTHUB_API_BASE_URL=""` and published from `build/` through GitHub Actions. Static release tests reject a configured backend URL, private assets, source maps and broken base paths. The [PR #37 merge deployment](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263) completed successfully on November 18, 2026.
- `api/` is **loopback-only** and has no public deployment workflow. JWT signing secrets and MySQL credentials remain private. Health readiness checks connectivity rather than schema completeness; migrations are a separate step.
- Frontend CI runs a **React peer dependency guard before strict `npm ci`**, Jest/coverage, lint, production-only high/critical audit, build, tooling and Pages release checks. React and React DOM remain **18.3.1**; React Leaflet 4.x and the clipboard integration prevent an unreviewed React 19-only bump. See [React migration policy](react-dependency-policy.md).
- Backend CI uses disposable MySQL for repeatable migrations/seeds, auth/RBAC, concurrent updates, rollback and idempotency tests. Report-only full npm audits still surface development-tool advisories; passing production gates is not equivalent to zero vulnerabilities.
- No public backend, real personal records, distributed login limit, token denylist, database-level audit immutability, backup rehearsal or tenant ownership exists. See the [release NO-GO conditions](release-readiness-pr8.md).

## 5. Roadmap status and remaining work

PRs **#1–#8 are completed**, with PR #30 implementing the last milestone. Follow-up PR #39 fixed the offline detail-drawer status action and removed the Demo Checklist; PR #37 restored React 18/DOM 18 compatibility with future-upgrade tests. Current GitHub activity and branch protection settings should be verified separately.

Future work is **not a missing part of the original eight-PR MVP**: React 19 migration with compatible integrations, separate reviewed public API infrastructure, tenant/record RBAC, multi-node abuse protection, JWT revocation, tamper-evident audit retention, and operational backup/monitoring. Do not quietly claim these features exist.

See [implemented API contract](api-contract.md), [auth design](security-auth-pr4.md), [PR #5 transaction detail](workflow-audit-pr5.md), [frontend workflow UI](hiring-ui-pr6.md) and the [original offline/frontend design review](system-design-review.en.md).
