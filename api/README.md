# AssistantHub API foundation (PR #2 + read-only discovery in PR #3)

This is an **isolated, not-yet-deployed backend**. React and GitHub Pages continue using their existing local/mock-api sources. The implemented endpoints are:

- GET /api/health/live: 200 { "status": "ok" } even when DB is unavailable.
- GET /api/health/ready: 200 when MySQL responds, otherwise 503 { "status": "unavailable" }.
- GET /api/candidates: synthetic candidate list with server query `q` (name/role/skills), `role`, `availability`, `rate` (all/under40/40to60/over60), `sort` (nameAsc/rateAsc/rateDesc), `page` (1–1000), `pageSize` (1–96); returns { items, page, pageSize, total }.
- GET /api/candidates/:id: minimal synthetic candidate detail by UUID; 400 for malformed IDs, 404 for missing records.

Candidate discovery is temporarily **unauthenticated and restricted to synthetic-only fields**. Authentication, application transition, and audit-read endpoints are not implemented yet. Do not expose this unfinished service publicly or connect a production frontend to it.

## Local setup (Node 20.19+ / 22.12+, Docker)

From the repository root:

1. Run docker compose up -d mysql (the dev database binds only to 127.0.0.1:3307).
2. Copy api/.env.example to api/.env; local-only example credentials must never be used for real deployments.
3. Run commands below from the root, using the values in api/.env as your environment. Node supports --env-file, but npm does not automatically load api/.env.
4. Run npm ci --prefix api.
5. Run npm run db:migrate --prefix api and npm run db:seed --prefix api (both are safe to repeat on the same healthy schema).
6. Run npm start --prefix api and open http://127.0.0.1:3100/api/health/live and /api/health/ready.

Example Unix/macOS shell for the commands in steps 4–6:

    set -a
    . api/.env
    set +a
    npm ci --prefix api
    npm run db:migrate --prefix api
    npm run db:seed --prefix api
    npm start --prefix api

Set `API_CORS_ORIGIN=http://127.0.0.1:3000` for the local frontend origin; other browser origins get no CORS access. Run Vite with `VITE_ASSISTANTHUB_API_BASE_URL=http://127.0.0.1:3100` to enable the optional read-only browser; do not put passwords or tokens in Vite variables. Use only the synthetic seed; no actual candidate PII is returned.

To run database-backed tests locally (use only a disposable database), set NODE_ENV=test and run npm test --prefix api. The GitHub Actions api-ci.yml job provisions isolated MySQL and runs migration twice, seed twice, 4 health tests and a DB integration test, plus a **blocking production-only high-severity npm audit** and a separately labeled report of all dependency findings. `umzug` currently retains a **dev-tooling** transitive `picomatch` finding (GHSA-fc5q-39xc-vjpf) without a verified patched upstream version; Sequelize's `uuid` transitive advisory is also tracked. Neither is claimed as resolved.

## Schema and seed policy

- Four tables: users, candidates, applications (unique candidate_id, version starting at 1), audit_events (actor/application FKs, recorded status/reason/request ID).
- Migration history is recorded in SequelizeMeta using Umzug. Never use sequelize.sync() as a migration shortcut.
- The first migration intentionally has NO automatic destructive down migration.
- Umzug is a migration-time **devDependency**: CI installs it for migration and seed setup. The runtime-only production package installation (`npm ci --omit=dev`) does not include Umzug; deployment must execute migrations as a separately provisioned release job before installing/deploying runtime-only dependencies.
- **MySQL DDL is not transactionally atomic across tables.** An interrupted fresh migration may leave a partial schema even without a SequelizeMeta entry; investigate and restore backup (production) or recreate a disposable database (development) before retrying.
- Synthetic seed inserts six stable records and six New applications, with no real personal data or test users/passwords. It uses findOrCreate rather than overwriting an existing hiring state.
- API database credentials are required through environment variables; no default production password. Docker Compose passwords are clearly local-only and must not be reused outside a developer machine.
- A green /ready response tests connectivity, not that all schema migrations were applied. Run migrations as a separate deployment step.

The design proposal remains in ../docs/architecture-v2.md and ../docs/api-contract.md. Candidate discovery is included in PR #3; add login/RBAC in PR #4, transaction-safe workflow/audit writes in PR #5, React integration in PR #6.
