# AssistantHub Talent Pool

![CI](https://github.com/LEO0331/AssistantHub/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/LEO0331/AssistantHub/actions/workflows/deploy.yml/badge.svg)
![Coverage Gate](https://img.shields.io/badge/coverage%20gate-70%2F70%2F60-brightgreen)

AssistantHub is a React talent-pool portfolio app for searching fictional assistants, saving a shortlist and exploring a simple hiring workflow.

**[Open the live demo](https://leo0331.github.io/AssistantHub/)** — the public site is a **browser-only demo**. It does not use real candidate records, a public account system or a hosted MySQL backend.

## How to use the demo

1. **Find talent:** Browse the sample profiles or search and filter by role, availability and hourly rate.
2. **Explore candidates:** Use **Like**, **Shortlist** or **Detail** in Card or List Mode. List Mode uses a scrollable, virtualized table for larger pools.
3. **Track a sample hire:** Open a candidate's details and select **Advance Hire Status**. If they are not shortlisted yet, the same click adds them and advances `New → Contacted`. Then continue through `Interview → Hired`. `Hired` is final in the offline demo.
4. **Save or reset your work:** Export shortlist CSV or JSON demo data, import a previous JSON export, or use **Reset Demo Data** to return to the default setup.

### What does “Load Sample Demo” do?

It is an **optional presentation shortcut**, not a prerequisite for using the app. It sets a repeatable seed (`424242`), generates **500 fictional profiles** through the simulated `mock-api` adapter, resets filters/pagination and switches to Card Mode.

**Important:** loading the sample demo **clears your current local shortlist and inquiries**. Export JSON first if you want to preserve that work. The preset makes no network request to a real hiring backend. You can also open the demo using the `?demo=true` URL parameter.

To try larger sample sizes, use **Load 500**, **Load 2000** or **Load 5000**; List Mode renders only the rows near the visible scroll position.

## Features

- Deterministic fictional profiles generated with `@faker-js/faker`
- Search, role/availability/rate filters, sorting and pagination
- Card and virtualized list views, with accessible action buttons
- Browser-managed shortlist, hiring status, inquiries, import/export and optional sample preset
- Candidate details, contact form, map and help chatbot
- Optional **local authenticated hiring workflow** using Express, MySQL, JWT and server-side roles

The `local` and `mock-api` sources are both **browser simulations**; `mock-api` adds an artificial delay but does **not** call a server. The offline shortlist and seed are stored in `localStorage`; these browser values are not trustworthy business records.

## Optional local MySQL workflow

A separate backend in [`api/`](api/README.md) implements a more realistic hiring workflow for **synthetic data only**:

- Operator-provisioned Viewer, Recruiter and Admin accounts, with short-lived JWT authentication
- Server-side candidate queries, application details and paginated audit history
- Version-checked hiring transitions with an InnoDB transaction and audit event
- Database-backed idempotency keys and explicit safe retries for unknown HTTP outcomes

**This API runs on loopback only and is not deployed on GitHub Pages.** To use it, follow the [local API setup guide](api/README.md), start MySQL, migrate and seed the database, provision a test user and set a local nonsecret `VITE_ASSISTANTHUB_API_BASE_URL`. In that mode, application status and audit records are **server-authoritative**; the offline shortlist and status are not.

The backend is not approved for public/production hosting or real applicant data. It does not implement tenant ownership, a distributed login limiter or production-grade identity operations.

## Run locally

Use Node.js **20.19+ or 22.12+** (or a newer supported version), then:

```sh
npm run test:react-stack
npm ci
npm start
```

Open **http://127.0.0.1:3000/AssistantHub/**. Vite uses the `/AssistantHub/` base path and emits production files into `build/`.

To verify changes before a pull request:

```sh
npm run lint
npm run test:ci
npm run build
npm run test:tooling
npm run test:release
npm audit --omit=dev --audit-level=high
```

The release guard checks that the compiled GitHub Pages artifact contains **no configured backend URL or private server files**. Leave `VITE_ASSISTANTHUB_API_BASE_URL` unset/empty when building the public demo. The local API has its own MySQL integration tests and deployment requirements.

## Deployment and security

Merges to `main` trigger the [GitHub Pages deployment workflow](https://github.com/LEO0331/AssistantHub/actions/workflows/deploy.yml). It checks the React dependency graph, tests, lint, build, release artifact and production high/critical dependency audit before deploying the **static frontend only**.

React and React DOM are held at **18.3.1** because the current React Leaflet/clipboard integrations are not yet aligned for a React 19 migration. Dependency updates are reviewed rather than forced through incompatible peer requirements.

Security assessments are date-specific: a passing production audit gate is **not** the same as a clean full dependency audit or a production-ready backend.

## Technical documentation

- [Current implementation and limitations](docs/current-state.md)
- [System architecture](docs/architecture-v2.md)
- [Implemented local API contract](docs/api-contract.md)
- [Local deployment and security decision](docs/release-readiness-pr8.md)
- [React major-version upgrade policy](docs/react-dependency-policy.md)
- [Design review in English](docs/system-design-review.en.md) / [繁體中文](docs/system-design-review.zh-TW.md)

For implementation history, use [GitHub pull requests](https://github.com/LEO0331/AssistantHub/pulls?q=is%3Apr+is%3Amerged) rather than treating individual PR numbers as product features. Historical security assessment details and original Pages migration notes remain in the `docs/` folder.
