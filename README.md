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
- Vite 8 for development and production builds
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
