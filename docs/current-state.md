# AssistantHub 2.0 — current implementation and release status

**Verified:** 2026-11-18 against `main` at `a0d3310ff413` (merged PR #37). This is a dated implementation snapshot, not an assurance that future dependency advisories or deployments will remain unchanged.

## What runs where

| Surface | Implemented behavior | Hosting and trust boundary |
| --- | --- | --- |
| [Public GitHub Pages demo](https://leo0331.github.io/AssistantHub/) | React/Vite talent search, filtering, shortlist, details, local hire pipeline, JSON/CSV portability, 500/2,000/5,000-record generated demos | **Static, offline demo**. No hosted MySQL/API; local/mock data and shortlist are browser-managed and not access-controlled |
| Local browser with API origin configured | JWT sign-in; synthetic candidate search; read actual application/version/audit; permitted Recruiter/Admin transitions; explicit same-key retry on ambiguous outcome | Requires a **separately running loopback-only** Express/MySQL API and operator-provisioned test accounts. API-mode state changes are authoritative in MySQL |
| Express/MySQL API (`api/`) | Health, candidate lookup, auth/RBAC, application state machine, optimistic version check, transactional audit, actor-scoped idempotent result replay, sanitized logs | **Not deployed publicly**. `API_HOST` must be `127.0.0.1`, `::1`, or `localhost`. Synthetic data only |

The public Pages site's source is built with `VITE_ASSISTANTHUB_API_BASE_URL=""` and a release-artifact check. It is **not** a live, externally accessible full-stack product.

## Completed milestones

The AssistantHub 2.0 build-out (PRs #1–#8) is **implemented and merged**. The subsequent security and UI maintenance milestones are also merged:

- **PR #30 / milestone #8:** Loopback-only backend, no-store/security response headers, pinned GitHub Actions, production-only high/critical audit gates, offline Pages release guard and Dependabot scheduling.
- **PR #39:** Removed the presenter-only **Demo Checklist**. In the **offline detail drawer**, `Advance Hire Status` works even before shortlisting: the first click adds the candidate and moves `New → Contacted`; later clicks progress `Interview → Hired`. `Hired` is final rather than cycling back to `New`. This is **browser demo state**, not a MySQL transaction.
- **PR #37:** Fixed a Dependabot `react-dom@19.3.1`-only upgrade that failed `npm ci` with `ERESOLVE`. React **18.3.1** and React DOM **18.3.1** remain paired; React Leaflet 4.x and the clipboard integration still constrain a React 19 move. CI/Lighthouse/Pages now run `npm run test:react-stack` **before** `npm ci` to reject unsupported major-version mixes. React 19 was **not** installed.

The PR #37 merge on 2026-11-18 triggered a successful [Deploy AssistantHub workflow](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263), publishing the **static** artifact to [GitHub Pages](https://leo0331.github.io/AssistantHub/). Later deployments must be checked independently.

## Backend contract and authorization

- `POST /api/auth/login`: short-lived (15-minute) JWT; operator-provisioned accounts; no public signup. Current DB user/role is revalidated on protected requests. Failed logins have a **process-local** limit, not distributed production abuse protection.
- `GET /api/candidates` and `GET /api/candidates/:id`: Viewer/Recruiter/Admin; synthetic records, bounded search and pagination. `GET /api/candidates/:id/application` returns the real MySQL application ID.
- `GET /api/applications/:id` and `GET /api/applications/:id/audit-events`: authenticated read with pagination for history; global synthetic-only RBAC, **not tenant- or record-ownership isolation**.
- `POST /api/applications/:id/transitions`: Recruiter/Admin; state machine `New → Contacted → Interview → Hired`, with `Rejected` available from each nonterminal state. Requires `expectedVersion` and a UUID-v4 `Idempotency-Key`. App change, audit and stored result commit in **one MySQL transaction**. Same actor/key/payload can replay the original response during retention; conflicts/mismatched payloads fail closed.
- Audit/event metadata and structured HTTP logs are server-generated; no PII-safe/public-deployment guarantee should be inferred from synthetic-data tests.

Use [API contract](api-contract.md), [API setup](../api/README.md), [PR #7 idempotency guide](idempotency-pr7.md) and [PR #8 deployment decision](release-readiness-pr8.md) for exact request semantics and constraints.

## Security, dependency, and operational status

- CI runs strict `npm ci`, React compatibility, frontend tests/coverage/lint, production-only audit gate, static release tests and Lighthouse. API CI uses real MySQL and a production-only audit gate. No `--force` or `--legacy-peer-deps` bypass.
- **Historical audit evidence (2026-11-18):** full root `npm audit` reported **43 affected package names** (39 high, 4 moderate), while production-only root audit reported **0** at the time. The full API audit had **6 affected package names** (4 high, 2 moderate), with **2 moderate** in the API production subset. These are dated findings, not a current scanner report or 43 distinct root vulnerabilities.
- [Dependency assessment](security-dependency-assessment-2026-11-18.md) is a **historical analysis**; [October 5 Dependabot review](dependabot-review.md) is an older snapshot that was clean **at that date only**. [React compatibility policy](react-dependency-policy.md) documents why React 19 is still deferred.
- Public API hosting, real applicant PII, tenant ownership, centralized rate limiting, robust JWT revocation, tamper-evident audit retention, recovery rehearsals and formally reviewed production infrastructure remain **NO-GO** until separately designed and tested.

## Local verification commands

From repository root, with a supported Node version:

```sh
npm ci
npm run test:react-stack
npm run lint
npm run test:ci
npm run build
npm run test:tooling
npm run test:release
npm audit --omit=dev --audit-level=high
```

To verify the **public Pages-equivalent** offline artifact, leave `VITE_ASSISTANTHUB_API_BASE_URL` unset/empty when building. For the optional private backend, follow [api/README.md](../api/README.md): separate local MySQL, migrations/seed, explicit account provisioning and an exact `API_CORS_ORIGIN`.

## Source-of-truth hierarchy

**Current deployment and code:** `main` + [GitHub Actions](https://github.com/LEO0331/AssistantHub/actions). **Current contracts:** this page, [API contract](api-contract.md), and the [release runbook](release-readiness-pr8.md). **Design snapshots and historical reviews:** [system design review (English)](system-design-review.en.md), [系統設計審查（繁體中文）](system-design-review.zh-TW.md), PR-specific documents and dated security assessments. Do not interpret the design-era "planned" wording in archived sections as the present implementation state.
