# AssistantHub 2.0 — proposed architecture

> PR #1 proposed the architecture. PR #2 adds an isolated Express/MySQL foundation. PR #3 adds read-only synthetic candidate list/detail endpoints and an optional, separately configured server-paginated React browser. PR #4 adds scrypt password verification, short-lived JWTs, current-database-role RBAC, operator-only provisioning, and in-memory frontend authentication. Default GitHub Pages remains an offline demo; the backend is not deployed. Authentication and candidate RBAC were implemented in PR #4; PR #5 implements transactional hiring status changes and audit-read APIs on MySQL. The frontend hiring workflow and audit timeline are still planned for PR #6.

## 1. Purpose and boundaries

Evolve AssistantHub from a client-only assistant/talent directory into a **small hiring workflow and audit demo** that is credible in backend engineering interviews. Keep the existing deployed application functional while moving one vertical slice at a time.

### Present implementation (verified on main at PR #1)
- React 18 + Vite SPA at the GitHub Pages base path /AssistantHub/; Vite output directory is build/.
- Seeded @faker-js/faker profiles, up to 5,000 in-browser records; search, filters, pagination and a virtualized list.
- src/services/talentAdapter.js exposes local and mock-api modes; mock-api simulates a delay and does **not** make HTTP requests.
- Shortlist and seed use localStorage; hiring status changes and inquiries are not authoritative server data.
- JSON import/export, CSV shortlist export, a rule-based help chatbot, map modal and details drawer.
- Jest/React Testing Library coverage gates, lint, Vite build, tooling checks and GitHub Actions Pages deployment.

### MVP boundaries
- One synthetic candidate has at most one application in this demo. Multi-company tenancy, job requisitions, scheduling, email delivery and real applicant data are out of scope.
- Viewer can read; Recruiter and Admin can make permitted application transitions. Admin user management is deferred.
- Server persistence and auditability replace browser state as the authority for the live API mode. Offline local/mock modes remain available and explicitly labeled non-authoritative.
- No AI ranking, LLM integration, Redis, queues, microservices or Kubernetes unless supported by a documented, tested requirement.

## 2. Proposed modular-monolith components

~~~text
GitHub Pages: React/Vite SPA (/AssistantHub/)
    | HTTPS JSON requests; auth; request ID
    v
Separately hosted Express API (/api/v1 or /api, to be finalized in PR #2)
    |- request validation and error boundary
    |- JWT authentication and deny-by-default RBAC
    |- candidate query controller/service
    |- application workflow service and state machine
    |- audit history read service
    v
Sequelize with explicit MySQL transactions and migrations
    |- users
    |- candidates
    |- applications (status, version)
    |- audit_events (append-only business history)
    |- idempotency_requests (planned for PR #7)
~~~

Use a modular monolith, rather than separate services, to keep transaction boundaries, local development and debugging understandable. Controllers translate HTTP contracts; services enforce domain rules; database modules own persistence. Do not put authorization or workflow decisions exclusively in React.

### Planned repository boundaries
- src/: existing frontend; later split candidate, hiring and audit UI into feature modules.
- src/services/talentAdapter.js: stable point for adding an api adapter without altering local/mock behavior.
- api/src/routes, controllers, services, middleware, models, validators: new backend, introduced in PR #2.
- api/migrations and api/seeders: deterministic, repeatable database setup.
- api/tests: unit, HTTP integration, transaction and concurrency cases.
- docs/: architecture, API contract, threat model, verification evidence.

## 3. Domain model and key constraints (proposed)

| Entity | Key fields | Constraints / rationale |
| --- | --- | --- |
| users | id, email, password_hash, role, is_active | unique normalized email; password hashes, not plaintext |
| candidates | id, name, role, skills, availability, hourly_rate, created_at | synthetic demo records; use explicit query indexes |
| applications | id, candidate_id, status, version, updated_at | candidate_id unique in MVP; version starts at 1; FK |
| audit_events | id, application_id, actor_id, from_status, to_status, occurred_at, request_id | FK; immutable business history; transactionally inserted |
| idempotency_requests (PR #7) | id, actor_id, key, request_hash, status, stored_result | unique key scoped by actor/operation; expired records cleaned up |

Exact column types and migrations are PR #2 deliverables. Define indexes based on actual query patterns, not speculative optimizations.

### Allowed hiring status transitions

- New -> Contacted or Rejected
- Contacted -> Interview or Rejected
- Interview -> Hired or Rejected
- Hired and Rejected are terminal in the MVP.

The current frontend offers a different local-only linear status sequence; it must **not** be presented as enforcing this proposed state machine. Backend domain validation is required before the new workflow is considered implemented.

### Workflow and audit invariants
1. Only authenticated Recruiter/Admin roles may transition an application; all endpoints validate object-level permissions.
2. The server checks that the current status can transition to the target status.
3. An update requires expectedVersion from the client. The database update is conditional on application ID, version and current status; exactly one affected row means success.
4. On success, increment the version once and persist the corresponding audit event within the **same** MySQL transaction.
5. If update affects zero rows, distinguish not-found from stale version and return an appropriate 404 or 409. Invalid state transition is 422.
6. If the audit write fails, roll back the status update. Never report a committed transition without its audit event.
7. Audit history is server-authored. Client-supplied actor IDs, timestamps, prior status or version increment are not trusted.
8. PR #5 alone does not guarantee safe retries after an unknown network outcome. Persistent idempotency keys in PR #7 close that specific gap; until then, the client must refresh before retrying.

### Expected concurrency example
Two recruiters read application version 7 at Interview. Recruiter A requests Hired at version 7; Recruiter B requests Rejected at version 7. Only one conditional update may commit, yielding version 8 and exactly one audit event. The other request receives 409 Conflict with no successful-transition audit record. Concurrency tests must use real MySQL, not only mocked ORM calls.

## 4. Authentication, authorization and public-demo posture

- Planned: hashed-password login, short-lived signed JWT access tokens, server-validated expiry/issuer/audience where applicable, and no anonymous self-registration.
- Keep access tokens in frontend memory, not localStorage. Do not embed backend signing secrets or privileged credentials in GitHub Pages assets.
- Deny by default. 401 means missing/invalid authentication; 403 means authenticated but unauthorized.
- Viewer: candidate/application read and permitted audit history read. Recruiter: those reads plus valid transitions. Admin: same transition rights; account administration is a future scope decision, not a current endpoint.
- Query results and audit metadata must be scoped, validated and redacted appropriately. Never expose password hashes or internal secrets.
- GitHub Pages remains static and public; the backend is deployed separately, uses HTTPS, restricts CORS to approved origins and protects its database from direct public access.
- Use synthetic candidates only. Public users may browse a redacted read-only dataset; writable demos must be isolated per session and reset/expire. Never make a shared public write account authoritative.
- The existing client-only modes are editable from browser devtools. Do not describe them as secure or audited.

## 5. Incremental adapter migration

1. Preserve existing React route/base path and local/mock-api behavior.
2. PR #2: introduce isolated Express/MySQL backend without frontend consumer changes; add migrations, synthetic seeds, two health checks, HTTP and real-MySQL integration tests.
3. PR #3: add an **explicit** API source and separate read-only candidate browser (no fake contact fields), server pagination/filtering, response validation, AbortController cancellation, loading/error/retry states; keep local/mock modes unchanged.
4. PR #4: add authenticated API sessions and server-side authorization; do not rely on hidden UI controls.
5. PR #5: implement transactional state transitions and audit read API (completed in local backend, real-MySQL tests).
6. PR #6: integrate workflow controls and audit timeline into React; remove duplicate business authority from browser for API mode.
7. PR #7: implement persistent idempotency handling, structured logs, request IDs and failure-mode testing.
8. PR #8: tighten security gates, public isolated demo, deployment operations and interview guide.

Only PR #6 is the functional MVP. A passed docs-only PR #1 must not be represented as a working backend or security implementation.

## 6. Deployment, rollback and quality gates

- Do not modify GitHub Pages settings, /AssistantHub/ Vite base, build/ output, existing workflows, or npm dependencies in PR #1.
- PR checks currently include npm ci, npm run lint, npm run test:ci, npm run build, npm run test:tooling. Keep branch protections and existing security gates intact; never bypass a failed gate to ship.
- Future API CI must install and migrate a test MySQL database, run HTTP and transaction tests, and verify no secrets or real candidate data are committed.
- Each PR should have a focused diff, risk/rollback notes and verifiable acceptance criteria. New API functionality should be feature-gated until it passes.
- Preserve the last working Pages frontend when backend deploys fail; offline mode is a demonstration fallback, not a production consistency solution.
- Do not merge automatically; review changes and check status before integration.

## 7. Open decisions for implementation PRs

- Final Express route prefix, package/module format, Node baseline and database migration tool (PR #2).
- Whether candidate profiles may include fake contact details in the public read model or should be consistently redacted (PRs #2–#3).
- Exact authentication token refresh/logout strategy and account provisioning (PR #4).
- Audit retention/immutability enforcement and RBAC for history reads (PR #5).
- Idempotency key retention, payload-mismatch response and pending-request concurrency semantics (PR #7).
- Public demo hosting provider and session isolation/reset architecture (PR #8).

See [api-contract.md](api-contract.md) for proposed HTTP responses and error semantics. The existing [system design review](system-design-review.en.md) describes the original frontend, not the proposed implementation.
