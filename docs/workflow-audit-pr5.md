# PR #5 — Hiring workflow, optimistic locking and audit trail

## What is implemented

**Historical scope:** PR #5 introduced the initial transactional hiring workflow before idempotency was built. **Current status (PR #7 and later):** every transition POST also requires a UUID-v4 `Idempotency-Key`, and exact actor/key/payload retries may replay the original committed response. Do not use the original example without its key. See [current contract](api-contract.md) and [idempotency guide](idempotency-pr7.md).

The **isolated, not-yet-deployed** Express/MySQL API exposes:
- `GET /api/applications/:id` — Viewer, Recruiter, Admin; returns { id, candidateId, status, version, updatedAt }.
- `POST /api/applications/:id/transitions` — **Recruiter/Admin only**; body { toStatus, expectedVersion, reason? }; returns { application, auditEventId }.
- `GET /api/applications/:id/audit-events` — Viewer, Recruiter, Admin; page 1–1000, pageSize 1–50 (default 20), chronological with ID tie-breaker.

All endpoints require the **PR #4 JWT** and a currently active database user. There is no anonymous, shared public writable demo. All candidates and applications are synthetic.

## State machine (server enforced)

| Current | Allowed next statuses |
| --- | --- |
| New | Contacted, Rejected |
| Contacted | Interview, Rejected |
| Interview | Hired, Rejected |
| Hired | *(terminal)* |
| Rejected | *(terminal)* |

Body validation rejects all unknown attributes including client-supplied `actorId`, `fromStatus`, version increments and timestamps. The server derives the actor from the authenticated database account and generates event IDs, request IDs and timestamps. A malformed request returns 400, invalid current-state transition 422, stale version 409, nonexistent record 404, unauthenticated 401 and viewer write 403. Unexpected database errors are sanitized as 503.

## Transaction consistency

For a permitted transition, the backend runs a single **InnoDB READ COMMITTED transaction**:

1. Read the current application, its status and version.
2. Verify the expectedVersion matches and the proposed status is allowed.
3. Issue a **single conditional SQL update** equivalent to:

```sql
UPDATE applications
SET status = :toStatus,
    version = version + 1,
    updated_at = :serverTime
WHERE id = :applicationId
  AND version = :expectedVersion
  AND status = :previousStatus;
```

4. Require **exactly one affected row**. Zero rows means the concurrent request lost the compare-and-swap race and gets 409 Conflict. (The transaction is rolled back.)
5. Insert the audit event within **that same transaction**. If insertion fails, the application update rolls back. Only a successful commit causes a 200 response.

The GET application endpoint and history let a client discover the committed outcome. All writes are issued through this service; there is no browser-side authoritative status update in PR #5.

### Examples

```http
GET /api/applications/00000000-0000-4000-8000-000000000101
Authorization: Bearer <in-memory-access-token>
```

Initial seeded application status is `New`, version `1`; the sample ID corresponds to candidate seed #1's application.

```http
POST /api/applications/00000000-0000-4000-8000-000000000101/transitions
Authorization: Bearer <in-memory-access-token>
Idempotency-Key: 0b0abda8-2cff-4874-9fe3-55f0cb784a41
Content-Type: application/json

{"toStatus":"Contacted","expectedVersion":1,"reason":"Introductory review"}
```

Success returns status `Contacted`, version `2` and an auditEventId. **As implemented since PR #7**, repeating the **identical** actor/key/payload returns the original 200 response with `Idempotency-Replayed: true`, not a second audit event. A fresh key carrying the now-stale `expectedVersion: 1` returns 409. On network uncertainty, do **not** generate a new key for an unconfirmed request; use the [explicit same-key recovery contract](idempotency-pr7.md).

```http
GET /api/applications/00000000-0000-4000-8000-000000000101/audit-events?page=1&pageSize=20
Authorization: Bearer <in-memory-access-token>
```

Audit rows expose only `id`, `applicationId`, `actorId`, `fromStatus`, `toStatus`, `reason`, `occurredAt`, `requestId`. They do not expose actor email, password hash or authorization credentials.

## Real MySQL test evidence

`api/tests/workflow.check.mjs` exercises:
- 401 no token, 403 Viewer transition, 200 reads for the authenticated roles, 404 missing and 400 malformed IDs.
- New → Contacted → Interview → Hired with increasing version and exactly one audit row per success.
- Rejected from all three nonterminal states, with terminal-state 422.
- 409 stale version, invalid transition 422, input validation 400, no audit on any rejection.
- **Four separate concurrent competing update races**, each requiring exactly one 200, one 409 and one audit row from the successful actor.
- Injected audit persistence failure in a real MySQL transaction, proving the status/version rollback, then successful retry.
- Authenticated audit pagination with stable chronological order and no PII.

The tests use test-only synthetic fixtures and clean up inserted records. Existing seed rows and offline UI remain unchanged.

## Deliberate limitations

- **Synthetic single-tenant data only**: the current RBAC grants all authenticated viewers access to all synthetic application IDs. Real hiring or bank/customer data would require tenant/record ownership authorization, field masking, audit retention and privacy design.
- HTTP routes have no audit update/delete endpoint, but **database-level append-only enforcement has not been established**; a privileged DBA can edit rows. Database grants, retention, immutable log transport and monitoring are future hardening.
- PR #5's conditional version update alone did not protect response-loss retries. **PR #7 now adds** actor-scoped persisted idempotency claims and response replay (seven-day retention, pending key held in browser memory). This is not a guarantee beyond retention or across lost client-side keys.
- PR #5 introduced server-only workflow APIs; PR #6 connected authenticated workflow controls and audit history to React. The public Pages build remains offline-only, and local/mock modes remain unaudited.
- Do **not** deploy this unfinished API publicly, put real applicants into the database, share writable accounts or claim production banking-grade security. Existing root/API dependency advisories remain outstanding, and no CI policy has been relaxed.
