# AssistantHub Talent Pool

![CI](https://github.com/leo0331/AssistantHub/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/leo0331/AssistantHub/actions/workflows/deploy.yml/badge.svg)
![Coverage Gate](https://img.shields.io/badge/coverage%20gate-70%2F70%2F60-brightgreen)

AssistantHub is a React talent-pool portfolio demo with **two distinct data modes**: a public offline/browser simulation and an optional locally run, JWT-protected Express/MySQL hiring workflow. The public GitHub Pages site does not host a backend.

## AssistantHub 2.0 — completed milestones and current status

**PRs #1–#8 are merged and the locally runnable full-stack MVP is implemented.** It includes Express/MySQL persistence, JWT authentication and server-side RBAC, optimistic version-based hiring transitions, atomic audit events, and durable actor-scoped idempotent replay. **Public GitHub Pages remains an offline-only frontend**; the API is loopback-only and is not approved for public hosting. See the [verified current-state summary (November 18, 2026)](docs/current-state.md).

- [Architecture and phased rollout](docs/architecture-v2.md)
- [Implemented local REST API contract and test scenarios](docs/api-contract.md)
- PR #1: documentation and nonfunctional configuration cleanup only.
- PR #2: isolated Express/MySQL foundation (complete).
- PR #3: read-only synthetic candidate API, server search/paging and optional frontend browser.
- PR #4: JWT login, server-enforced RBAC, rate-limited authentication and in-memory API browser session.
- PR #5: transactional hiring workflow and durable MySQL audit (API-only).
- PR #6: connect authenticated hiring status controls and audit timeline to React (first local full-stack MVP).
- PR #7: persistent actor-scoped idempotency, same-key safe replay, request IDs, structured logs and bounded retention (implemented).
- PR #8 (PR #30): local API security headers and loopback binding, pinned CI actions, offline Pages artifact guard, dependency monitoring and release criteria (merged).
- PR #39: removed the internal Demo Checklist; the offline detail drawer now advances status even before shortlisting, and **Hired** remains final (merged).
- PR #37: restored React/React DOM 18.3.1 compatibility and added a pre-install dependency guard after an unsafe React DOM 19-only upgrade failed (merged; React 19 remains deferred).

Existing `local` and `mock-api` data sources remain browser simulations (the latter uses a timer, **not** an HTTP API). The GitHub Pages base path is `/AssistantHub/` and Vite output directory is `build/`. All data is synthetic; do not treat demo contact/profile information as real applicants.

## Highlights
- Deterministic talent generation via `@faker-js/faker` (seed-controlled).
- Data-source options (`local` / `mock-api` / optional **authenticated MySQL** `api`), with the public static build remaining offline-only.
- Talent filters: role, availability, rate range, and text search.
- Offline talent detail drawer and separate authenticated API workflow panel when a private backend is configured.
- Offline status pipeline: `New → Contacted → Interview → Hired` (**Hired** is final). In the detail drawer, the first advance also adds an unshortlisted candidate to the shortlist. The API has a distinct, server-enforced state machine including **Rejected**.
- Local demo data portability with CSV and JSON export/import.
- Large-volume demo support: `Load 500/2000/5000`, virtualized list mode, pagination.
- Chatbot helper + map modal + contact inquiry flow.

## AssistantHub 2.0 backend foundation

The repository also contains an **isolated API foundation** in [api/](api/README.md): Express 5, Sequelize 6, MySQL 8.4 schema migrations, repeatable synthetic seed records (36 candidates in PR #3), and `/api/health/live` and `/api/health/ready` endpoints. This backend is **not deployed**. The optional authenticated API browser can call it when `VITE_ASSISTANTHUB_API_BASE_URL` is configured; the default GitHub Pages and local/mock-api flows remain unchanged. Authentication and role-protected candidate reads are included in PR #4. PR #5 adds transactional application transitions/audit; PR #6 connects authenticated hiring controls and audit history; PR #7 adds durable idempotency keys and an explicit same-key retry on uncertain HTTP outcomes. For transaction and failure-mode details see [PR #5 workflow review](docs/workflow-audit-pr5.md). See [architecture](docs/architecture-v2.md), [current status](docs/current-state.md) and the [implemented local API contract](docs/api-contract.md).

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

## Release readiness and secure CI

The [PR #8 release and security decision](docs/release-readiness-pr8.md) distinguishes the **public offline GitHub Pages demo (allowed after review)** from the **local authenticated MySQL API (not approved for public hosting)**. API_HOST is loopback-only. CI validates dependency production high/critical gates, pinned GitHub Action commits, least-privilege workflows and the compiled Pages artifact. Root/npm, API/npm and Actions Dependabot updates are now scheduled weekly; warnings are reviewed, not auto-dismissed. To check a local production bundle, run `VITE_ASSISTANTHUB_API_BASE_URL="" npm run build && npm run test:release`.

## React upgrade compatibility

The React 18 + React DOM 18 runtime is retained until its React Leaflet and clipboard dependencies support React 19. Run `npm run test:react-stack` to validate the locked React dependency graph without bypassing peer checks. See [React major-version policy](docs/react-dependency-policy.md).

## Dependency security assessment

The [November 18, 2026 dependency assessment](docs/security-dependency-assessment-2026-11-18.md) captures a **dated audit snapshot**, not a continuously current vulnerability count; rerun the report-only dependency workflow for fresh evidence. A successful report job does **not** mean the dependency tree is clean. The October 5 Dependabot review is also historical. See [current-state summary](docs/current-state.md).

## Authenticated MySQL hiring workflow (PRs #3–#7)

Start the [API foundation](api/README.md), migrate and seed the local MySQL database, and configure the frontend with a **public, nonsecret origin**:

```sh
VITE_ASSISTANTHUB_API_BASE_URL=http://127.0.0.1:3100 npm start
```

In the Data source selector choose **Real MySQL API (authenticated workflow)**. This mode performs **server-side** name/role/skills search, availability/rate filters, stable sorting and bounded pagination, with request cancellation and explicit failure/retry states. If the origin is unset, the API option is disabled; the existing demo remains offline. The API browser now signs in with an operator-provisioned account and sends a short-lived JWT in Authorization headers. The token stays only in React memory. Only synthetic data is served. The **API-mode hiring panel now persists status changes and audit events on MySQL** for Recruiter/Admin; local/mock shortlist and hiring actions remain browser-only. The backend is not publicly deployed; do not expose unauthenticated endpoints with real candidate records. `API_CORS_ORIGIN` must be set to the precise frontend origin in the backend environment.

Workflow demo: sign in, select a candidate, choose **View hiring workflow**, inspect server status/version and paginated audit events. Recruiter/Admin may submit permitted transitions; Viewer may only read. On 409 the UI requires a server refresh; on uncertain network/5xx outcomes it holds the original UUID-v4 idempotency key and exact payload and offers an **explicit same-key safe retry**. It never automatically repeats a POST or creates a new key for an uncertain write. See [PR #7 replay/retention guide](docs/idempotency-pr7.md). See [PR #6 UI and recovery guide](docs/hiring-ui-pr6.md). The backend remains local-only; no real applicants or public writable accounts.

## Security & Demo Limitations
- The **public offline frontend** is a client-only demo: shortlist and status data are editable in browser devtools and must not be treated as secure or authoritative. The optional local API uses backend-verified JWT/RBAC and MySQL state.
- Imported JSON is schema-validated and size-capped, but it is still untrusted demo input; do not use this flow for sensitive data.
- The offline/local/mock demo still has no authorization (its browser state is editable). The separate API browser requires login and server-side RBAC from PR #4.
- In offline local/mock modes there is no server audit; authenticated API mode persists MySQL transitions and audit events.
- Virtualized and paginated rendering supports large demo pools, but browser memory/CPU still set the practical upper bound.

## Scripts
- `npm start`: run dev server
- `npm run build`: production build
- `npm run preview`: preview the production build locally
- `npm test`: run tests
- `npm run test:coverage`: run tests with coverage
- `npm run test:ci`: CI test mode (`coverage + no watch`)
- `npm run test:react-stack`: validate the React 18 / React DOM 18 locked dependency graph and integration peer compatibility; also runs before `npm ci` in CI, Lighthouse and Pages deployment
- `npm run test:tooling`: integration checks for dev-server protections and built asset paths (run after build)
- `npm run test:release`: checks workflow supply-chain pins/least privilege and rejects unsafe or API-enabled Pages artifacts (run after building offline)
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
- Pull requests run [CI](https://github.com/LEO0331/AssistantHub/actions/workflows/ci.yml) for React dependency compatibility, strict `npm ci`, lint, coverage, build, tooling, **blocking production high/critical dependency audit** and offline artifact/supply-chain policy checks.
- Pushes to `main` run [Deploy AssistantHub](https://github.com/LEO0331/AssistantHub/actions/workflows/deploy.yml): pre-install React compatibility, lint, tests, Vite build, tooling, audit and the **offline release guard** precede uploading `build/`. The backend URL is explicitly disabled in the public build. [The PR #37 merge deployment succeeded](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263) on November 18, 2026.
- A separate deployment job uses `actions/deploy-pages` to publish the artifact to the `github-pages` environment. It requires `pages: write` and `id-token: write`; the build job only needs read access. No generated-site commits or `gh-pages` branch are needed after the Pages source is migrated.
- The Vite base path remains `/AssistantHub/`, with the public URL at https://leo0331.github.io/AssistantHub/.

### Historical migration procedure: switch Pages from `gh-pages` to GitHub Actions

The GitHub Actions Pages deployment was already working as of the [verified November 18 deployment](https://github.com/LEO0331/AssistantHub/actions/runs/44249787263). The steps below are retained **for historical migration or disaster recovery**, not as an outstanding task. Current Pages settings must still be checked independently before any administrative change. The workflow does **not** modify Pages repository settings. Historical migration procedure:

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
