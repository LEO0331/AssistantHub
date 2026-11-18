# AssistantHub Talent Pool

![CI](https://github.com/leo0331/AssistantHub/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/leo0331/AssistantHub/actions/workflows/deploy.yml/badge.svg)
![Coverage Gate](https://img.shields.io/badge/coverage%20gate-70%2F70%2F60-brightgreen)

AssistantHub is a lightweight React talent-pool demo portal for discovering assistants, shortlisting talent, and progressing hire requests through a local pipeline.

## AssistantHub 2.0 roadmap (incremental upgrade)

An incremental upgrade to a **Hiring Workflow & Audit System** is planned. The proposed system adds a separately hosted Express API, Sequelize/MySQL persistence, JWT authentication, server-side RBAC, version-based optimistic concurrency, and a transactional audit trail. **PRs #2–#6 now deliver a locally runnable full-stack hiring workflow MVP:** Express/MySQL persistence, JWT/RBAC, version-checked hiring transitions, a transactional audit history, and an authenticated React workflow panel. The backend remains **not publicly deployed**; default GitHub Pages/local/mock demo flows are unchanged unless an API origin is explicitly configured.

- [Architecture and phased rollout](docs/architecture-v2.md)
- [Draft REST API contract and test scenarios](docs/api-contract.md)
- PR #1: documentation and nonfunctional configuration cleanup only.
- PR #2: isolated Express/MySQL foundation (complete).
- PR #3: read-only synthetic candidate API, server search/paging and optional frontend browser.
- PR #4: JWT login, server-enforced RBAC, rate-limited authentication and in-memory API browser session.
- PR #5: transactional hiring workflow and durable MySQL audit (API-only).
- PR #6: connect authenticated hiring status controls and audit timeline to React (first local full-stack MVP).
- PR #7: persistent idempotency for safe HTTP retries, request IDs and structured failure logging.
- PR #6: integrate the real API workflow into React; first functional MVP.
- PRs #7–#8: idempotency/failure handling and isolated public demo hardening.

Existing `local` and `mock-api` data sources remain browser simulations (the latter is a timer, **not** an HTTP API). The GitHub Pages base path `/AssistantHub/`, output directory `build/`, CI and deployment behavior are unchanged by PR #1. Do not use synthetic profile/contact data as real hiring information.

## Highlights
- Deterministic talent generation via `@faker-js/faker` (seed-controlled).
- Data-source options (`local` / `mock-api` / optional read-only `api`) for backend migration readiness.
- Talent filters: role, availability, rate range, and text search.
- One-page talent detail drawer (no routing, no backend).
- Local hire status pipeline: `New -> Contacted -> Interview -> Hired`.
- Local demo data portability with CSV and JSON export/import.
- Large-volume demo support: `Load 500/2000/5000`, virtualized list mode, pagination.
- Chatbot helper + map modal + contact inquiry flow.

## AssistantHub 2.0 backend foundation

The repository also contains an **isolated API foundation** in [api/](api/README.md): Express 5, Sequelize 6, MySQL 8.4 schema migrations, repeatable synthetic seed records (36 candidates in PR #3), and `/api/health/live` and `/api/health/ready` endpoints. This backend is **not deployed**. The new optional read-only API browser can call it when `VITE_ASSISTANTHUB_API_BASE_URL` is configured; the default GitHub Pages and local/mock-api flows remain unchanged. Authentication and role-protected candidate reads are included in PR #4. PR #5 adds transactional application transitions/audit; PR #6 connects an authenticated React workflow and audit timeline with explicit 409/unknown-outcome refresh. For transaction and failure-mode details see [PR #5 workflow review](docs/workflow-audit-pr5.md). See [architecture](docs/architecture-v2.md) and [draft API contract](docs/api-contract.md).

## Tech Stack
- React 18
- Vite 8 for development and production builds
- Jest + React Testing Library
- Leaflet / React Leaflet
- Font Awesome
- `@faker-js/faker`

## Local State Model
The existing offline demo retains client-side state; API mode reads a separate local MySQL backend only when configured:
- `localStorage`: shortlist, seed
- in-memory state: generated talent list, filters, inquiries, UI modal/drawer state

## Dependency security assessment

The [November 18, 2026 dependency assessment](docs/security-dependency-assessment-2026-11-18.md) documents current audit findings and a separate report-only workflow. A successful diagnostic check does **not** certify a clean dependency tree; application CI/security gates are unchanged. The October 5 Dependabot review is historical.

## Authenticated MySQL hiring workflow (PRs #3–#6)

Start the [API foundation](api/README.md), migrate and seed the local MySQL database, and configure the frontend with a **public, nonsecret origin**:

```sh
VITE_ASSISTANTHUB_API_BASE_URL=http://127.0.0.1:3100 npm start
```

In the Data source selector choose **Real MySQL API (authenticated workflow)**. This mode performs **server-side** name/role/skills search, availability/rate filters, stable sorting and bounded pagination, with request cancellation and explicit failure/retry states. If the origin is unset, the API option is disabled; the existing demo remains offline. The API browser now signs in with an operator-provisioned account and sends a short-lived JWT in Authorization headers. The token stays only in React memory. Only synthetic data is served. The **API-mode hiring panel now persists status changes and audit events on MySQL** for Recruiter/Admin; local/mock shortlist and hiring actions remain browser-only. The backend is not publicly deployed; do not expose unauthenticated endpoints with real candidate records. `API_CORS_ORIGIN` must be set to the precise frontend origin in the backend environment.

Workflow demo: sign in, select a candidate, choose **View hiring workflow**, inspect server status/version and paginated audit events. Recruiter/Admin may submit permitted transitions; Viewer may only read. On 409 or a network error the UI **never auto-retries a write**; it freezes mutations until you explicitly refresh from MySQL. See [PR #6 UI and recovery guide](docs/hiring-ui-pr6.md). The backend remains local-only; no real applicants or public writable accounts.

## Security & Demo Limitations
- This is a client-only demo: all state can be modified in browser devtools and must not be treated as secure or authoritative.
- Imported JSON is schema-validated and size-capped, but it is still untrusted demo input; do not use this flow for sensitive data.
- The offline/local/mock demo still has no authorization (its browser state is editable). The separate API browser requires login and server-side RBAC from PR #4.
- No server-side audit trail exists; hire-status transitions are local only.
- Virtualized and paginated rendering supports large demo pools, but browser memory/CPU still set the practical upper bound.

## Scripts
- `npm start`: run dev server
- `npm run build`: production build
- `npm run preview`: preview the production build locally
- `npm test`: run tests
- `npm run test:coverage`: run tests with coverage
- `npm run test:ci`: CI test mode (`coverage + no watch`)
- `npm run test:tooling`: integration checks for dev-server protections and built asset paths (run after build)
- `npm run lint`: lint source files

## Run Locally
Requires Node.js 20.19+ or 22.12+ (including newer supported Node releases).

1. `npm ci`
2. `npm start`
3. Open `http://127.0.0.1:3000/AssistantHub/`

The development server binds to loopback. Vite uses `/AssistantHub/` as the base
path and writes production output to `build/` for GitHub Pages. Use
`npm run preview` to check that output at `http://127.0.0.1:4173/AssistantHub/`.
The browser target is Vite's modern-browser baseline; CRA's Browserslist settings
and OpenSSL legacy-provider workaround are no longer used.

## CI/CD
- Pull requests run [CI](https://github.com/LEO0331/AssistantHub/actions/workflows/ci.yml) for lint, coverage tests, build, and tooling checks.
- Pushes to `main` run [Deploy AssistantHub](https://github.com/LEO0331/AssistantHub/actions/workflows/deploy.yml): lint, tests, Vite build, and tooling checks precede uploading `build/` as an official GitHub Pages artifact.
- A separate deployment job uses `actions/deploy-pages` to publish the artifact to the `github-pages` environment. It requires `pages: write` and `id-token: write`; the build job only needs read access. No generated-site commits or `gh-pages` branch are needed after the Pages source is migrated.
- The Vite base path remains `/AssistantHub/`, with the public URL at https://leo0331.github.io/AssistantHub/.

### Migrate the Pages source and retire `gh-pages`

The workflow change does **not** modify GitHub Pages repository settings. For a safe one-time transition:

1. **Merge the workflow migration PR only after review.** Keep `gh-pages` intact until the new deployment is verified.
2. In [Settings → Pages](https://github.com/LEO0331/AssistantHub/settings/pages), change **Build and deployment → Source** from **Deploy from a branch** (`gh-pages` / root) to **GitHub Actions**. This requires repository administrative access.
3. Manually run [Deploy AssistantHub](https://github.com/LEO0331/AssistantHub/actions/workflows/deploy.yml) from `main` (or use `gh workflow run deploy.yml --repo LEO0331/AssistantHub --ref main`). If the merge-triggered run began before the Pages setting changed, rerun it after switching the source.
4. Confirm **build** and **deploy** both pass, then smoke-test https://leo0331.github.io/AssistantHub/ including CSS/JS assets, images, chatbot, search/filters, and mobile navigation. Check the deployment's environment URL and Pages settings before deleting the old branch.
5. Optionally preserve the historical published artifact as a Git tag, then delete the branch **in a separate manual operation**:

   ```bash
   git fetch origin
   git tag backup/assistanthub-gh-pages origin/gh-pages
   git push origin backup/assistanthub-gh-pages
   git push origin --delete gh-pages
   ```

Do **not** delete `gh-pages` merely because the PR was merged or a build passed. The successful native Pages **deployment and live-site smoke test** are the release criteria. If native deployment fails before branch deletion, keep the old branch and restore **Deploy from a branch → gh-pages / root** in Pages settings while troubleshooting. If a rollback is necessary after deleting the branch, restore it from the backup tag before switching the Pages source back. The migration PR intentionally does not alter Pages settings or delete branches.

## Testing Notes
Coverage thresholds are enforced in `jest.config.js`:
- branches: `70%`
- lines: `70%`
- statements: `70%`
- functions: `60%`
