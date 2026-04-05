# AssistantHub Talent Pool

![CI](https://github.com/leo0331/AssistantHub/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/leo0331/AssistantHub/actions/workflows/deploy.yml/badge.svg)
![Coverage Gate](https://img.shields.io/badge/coverage%20gate-70%2F70%2F60-brightgreen)

AssistantHub is a lightweight React talent-pool demo portal for discovering assistants, shortlisting talent, and progressing hire requests through a local pipeline.

## Highlights
- Deterministic talent generation via `@faker-js/faker` (seed-controlled).
- Data-source adapter switch (`local` / `mock-api`) for backend migration readiness.
- Talent filters: role, availability, rate range, and text search.
- One-page talent detail drawer (no routing, no backend).
- Local hire status pipeline: `New -> Contacted -> Interview -> Hired`.
- Local demo data portability with CSV and JSON export/import.
- Large-volume demo support: `Load 500/2000/5000`, virtualized list mode, pagination.
- Chatbot helper + map modal + contact inquiry flow.

## Tech Stack
- React 18
- Jest + React Testing Library
- Leaflet / React Leaflet
- Font Awesome
- `@faker-js/faker`

## Local State Model
There is currently no backend. State is client-side only:
- `localStorage`: shortlist, seed
- in-memory state: generated talent list, filters, inquiries, UI modal/drawer state

## Security & Demo Limitations
- This is a client-only demo: all state can be modified in browser devtools and must not be treated as secure or authoritative.
- Imported JSON is schema-validated and size-capped, but it is still untrusted demo input; do not use this flow for sensitive data.
- No authentication/authorization is implemented; anyone with browser access can operate all UI actions.
- No server-side audit trail exists; hire-status transitions are local only.
- Virtualized and paginated rendering supports large demo pools, but browser memory/CPU still set the practical upper bound.

## Scripts
- `npm start`: run dev server
- `npm run build`: production build
- `npm test`: run tests
- `npm run test:coverage`: run tests with coverage
- `npm run test:ci`: CI test mode (`coverage + no watch`)
- `npm run lint`: lint source files

## Run Locally
1. `npm install`
2. `npm start`
3. Open `http://localhost:3000`

## CI/CD
- Pull Requests run [CI workflow](https://github.com/leo0331/AssistantHub/actions/workflows/ci.yml) for lint + coverage tests.
- `main` branch deploys through [Deploy workflow](https://github.com/leo0331/AssistantHub/actions/workflows/deploy.yml).

## Testing Notes
Coverage thresholds are enforced in `jest.config.js`:
- branches: `70%`
- lines: `70%`
- statements: `70%`
- functions: `60%`
