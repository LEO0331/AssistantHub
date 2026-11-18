# AssistantHub 2.0 — implemented local REST API contract

> **Implementation verified November 18, 2026:** PRs #2–#8 implement the isolated **local-only** Express/MySQL API: health, JWT/RBAC, synthetic candidate discovery, application transitions, audit history, idempotent response replay and sanitized request metadata. PR #37 subsequently added React dependency compatibility checks. This is an **implemented demo API contract**, not an externally hosted service or a multi-tenant data-authorization model. The public GitHub Pages build is offline-only. See [current state](current-state.md) and [release posture](release-readiness-pr8.md).

## 1. Protocol and conventions

- REST/JSON under the implemented **`/api` prefix**; use local HTTP on loopback for development. An externally hosted HTTPS backend is **not deployed or approved**.
- Responses and error objects use application/json. User-provided identifiers, filters and request bodies are validated on the server.
- Protected endpoints require Authorization: Bearer <access-token>. The frontend must not determine authorization by hiding controls alone.
- Paginators use a bounded pageSize and stable ordering with an ID tie-breaker; no unbounded list dumps.
- Return 400 for malformed query/body; 401 for unauthenticated; 403 for unauthorized; 404 for inaccessible/missing record; 409 for optimistic concurrency conflict; 422 for a validly shaped but forbidden state transition; 429 for throttling; 500/503 for unexpected/unavailable service.
- Do not expose raw DB errors, stack traces, password hashes or token material in HTTP responses.
- The server generates `X-Request-ID` and allowlisted request logs independently of caller-provided headers; do not treat caller-supplied actor IDs or request IDs as authoritative.

### Standard error shape (implemented)

~~~json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Application was updated. Refresh before retrying."
  }
}
~~~

Errors use a sanitized `error.code` and `error.message` response; the correlation ID is in the **`X-Request-ID` response header**, not in this JSON body. Do not echo sensitive rejected input.

## 2. Authentication

### POST /api/auth/login
- Auth: public for login (in-memory per-IP failed-attempt throttling). No public registration.
- Body: email, password.
- Success 200: accessToken, tokenType ("Bearer"), expiresIn, user { id, email, role }; no password hash.
- Failure: 400 invalid shape; 401 generic invalid credentials; 429 throttled.
- Hash and verify passwords server-side. Do not support public signup or place credentials in the static demo bundle.
- PR #4: short-lived 15-minute JWT, no refresh endpoint or server-side logout. Frontend discards access token on local sign-out and re-authenticates after 401; server checks is_active and current role on every protected request.

### GET /api/auth/me (implemented PR #4)
- Auth: Bearer JWT; returns { user: { id, email, role } }, no password hash.

### GET /api/admin/users/summary (implemented PR #4)
- Auth: admin-only Bearer JWT. Returns aggregate total, active, and counts by role; Viewer/Recruiter receive 403.

## 3. Candidate discovery (read-only synthetic implementation in PR #3, protected by PR #4 RBAC)

### GET /api/candidates
- **Implemented:** Authenticated Viewer/Recruiter/Admin access to synthetic-only summary fields (id, name, role, skills, availability, hourlyRateUsd). 401 without valid Bearer JWT. No contact details.
- Optional query: q (max 100 characters; matches name, role, and skills), role, availability, rate (all, under40, 40to60, over60), sort (nameAsc, rateAsc, rateDesc), page (1–1000), pageSize (1–96). Unknown or malformed query parameters return 400.
- Success 200: { items: [candidateSummary], page, pageSize, total }.
- Sort keys must be allowlisted; SQL parameters must be bound, not concatenated.

~~~json
{
  "items": [
    {
      "id": "cand_demo_001",
      "name": "Example Candidate",
      "role": "Project Coordinator",
      "availability": "Available now",
      "hourlyRateUsd": 45
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
~~~

### GET /api/candidates/:id
- **Implemented:** Bearer JWT required, Viewer/Recruiter/Admin; synthetic-only response.
- Success 200: synthetic candidate detail with the same allowlisted fields as the list response.
- Failure 404: record missing or unavailable to the caller.

### GET /api/candidates/:id/application (implemented PR #6)
- Auth: Viewer, Recruiter, Admin. Maps an actual candidate UUID to its application read model; 404 when not found. Avoids using synthetic seed ID derivation.
- Success 200: { id, candidateId, status, version, updatedAt }, matching the application read model.

## 4. Application state (server implemented PR #5, React integration PR #6)

### GET /api/applications/:id
- Auth: Viewer, Recruiter, Admin; all synthetic application records are visible to these roles. **Per-record ownership/tenant authorization is not implemented**.
- Success 200 returns id, candidateId, status, version, updatedAt.
- status is one of New, Contacted, Interview, Hired, Rejected. version is a positive integer generated by the server.

~~~json
{
  "id": "app_demo_001",
  "candidateId": "cand_demo_001",
  "status": "Interview",
  "version": 7,
  "updatedAt": "2026-11-18T00:00:00.000Z"
}
~~~

### POST /api/applications/:id/transitions
- Auth: Recruiter or Admin; Viewer receives 403, anonymous clients 401. **No record-owner/tenant access model exists** in this single-tenant synthetic demo.
- Body: toStatus (enum), expectedVersion (positive integer), reason (bounded optional text).
- Actor identity is derived from the authenticated server context; do not accept actorId from the client.
- Success 200: { application: { id, candidateId, status, version, updatedAt }, auditEventId }.
- Errors: 400 invalid body; 401/403 access errors; 404 absent/inaccessible application; 409 stale expectedVersion; 422 transition outside the state machine.
- Permitted: New -> Contacted/Rejected; Contacted -> Interview/Rejected; Interview -> Hired/Rejected. Hired and Rejected are terminal.
- Atomicity: one conditional version/status update and one audit insert in the **same** DB transaction. On audit failure both must roll back. When one write loses a concurrency race, it creates no success event.
- **PR #7 implemented:** Require a UUID-v4 `Idempotency-Key` header; unique key scoped to current authenticated actor. First successful 200 stores its exact JSON response atomically with transition and audit. Same actor/key/application/canonical payload returns stored 200 with `Idempotency-Replayed: true`; a different request with the same key returns `409 IDEMPOTENCY_KEY_REUSED`. Missing header returns 428; malformed returns 400. Seven-day retention is guaranteed only while records are retained; manual pruning allows future reuse.

~~~json
{
  "toStatus": "Hired",
  "expectedVersion": 7,
  "reason": "Interview completed"
}
~~~

~~~json
{
  "application": {
    "id": "app_demo_001",
    "candidateId": "cand_demo_001",
    "status": "Hired",
    "version": 8,
    "updatedAt": "2026-11-18T00:00:10.000Z"
  },
  "auditEventId": "audit_demo_001"
}
~~~

## 5. Audit read model (server implemented in PR #5)

### GET /api/applications/:id/audit-events
- Auth: Viewer, Recruiter, Admin using the same current-user/JWT RBAC; no object-level tenant ownership check exists.
- Success 200: { items: [auditEvent], page, pageSize, total }; stable chronological ordering and bounded pagination.
- Event shape: id, applicationId, fromStatus, toStatus, actorId (or permitted redacted actor), occurredAt, requestId, reason when permitted.
- Server-generated business events are inserted transactionally and exposed **read-only via HTTP**. Database administrators can still modify table rows; database-enforced immutability is **not** implemented.
- Failure: 401/403/404 as appropriate. Do not expose password/token material or irrelevant personal data in event payloads.

### Idempotency and correlation metadata (PR #7)
- Only `POST /api/applications/:id/transitions` requires the `Idempotency-Key` header. It is a cryptographically generated UUID-v4, unique per business attempt for the same actor. Do not include it in URLs or logs.
- Response headers: `Idempotency-Replayed` true/false for successful transition; server-generated `X-Request-ID` on every HTTP response. CORS exact-origin config exposes those headers, not credentials.
- Missing key 428, malformed 400, mismatch 409. For network uncertainty, retry **the same key and body**, not an altered payload or new key; browser only does this by explicit user action.
- Seven-day retention and operator-only expired-record pruning. See [PR #7 idempotency guide](idempotency-pr7.md).

## 6. Operational endpoints (implemented in isolated PR #2 backend; not deployed)

- GET /api/health/live: process liveness; no secrets or infrastructure details.
- GET /api/health/ready: service readiness, including DB connectivity; minimal success/failure response with no credentials exposed.
- Health endpoints are public and local-only; the readiness endpoint checks MySQL connectivity, **not whether every migration was applied**. Any future public service needs separate health-path exposure and rate-limit decisions.

## 7. Acceptance test matrix (PRs #5 and #7 include real MySQL transaction/race/replay tests)

| Scenario | Expected result |
| --- | --- |
| Viewer attempts transition | 403, no state/audit change |
| Missing or bad JWT for protected read | 401 |
| Invalid transition (Hired -> Interview) | 422, no writes |
| Wrong expectedVersion | 409, no state/audit writes |
| Two actors concurrently modify version 7 | Exactly one successful version 8 and one audit event |
| Audit insert fails after conditional update | Rollback; prior version/status remain |
| Invalid pageSize or sort field | 400, no unbounded query |
| Retried committed request with matching key | Same 200 body and audit ID, replay header true, no duplicate transition/audit |
| Reused key with a different payload/application | 409 IDEMPOTENCY_KEY_REUSED, no additional write |

Tests must exercise the real MySQL transaction/concurrency behavior and the HTTP authorization boundary. Mocks are useful for unit tests but cannot prove transactional guarantees.

## 8. Adapter migration and compatibility

Source modes: **local** (seeded browser generation), **mock-api** (delayed browser generation, no HTTP), and a separately configured **authenticated api** browser. PR #3 originally introduced a read-only API browser; PR #6 added server-authoritative status and audit controls. For API mode, use server pagination rather than generating thousands of records in the browser, cancel stale requests, and show actionable non-sensitive error messages.

Do not repurpose browser localStorage shortlist/status as authoritative API data. Current API mode uses server-authoritative application and audit reads/writes from PR #6, while local/mock modes remain client-only and unprotected. Separate API hosting and safe public-demo policy are described in [architecture-v2.md](architecture-v2.md).
