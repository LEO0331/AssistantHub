# PR #7 — Durable idempotency, safe replay and request logging

The backend remains a **local-only, synthetic-data MVP**. PR #7 closes one specific transactional failure window: the application/audit COMMIT succeeds but its HTTP response is lost. It does not introduce a public backend, a new authentication flow, a tenant model, or exactly-once delivery beyond the configured retention period.

## Contract for POST /api/applications/:id/transitions

Every request must include a cryptographically generated **UUID-v4** Idempotency-Key header, scoped to the authenticated actor. The body remains { toStatus, expectedVersion, reason? }; actor identity and audit timestamp stay server-controlled.

| Situation | Response |
| --- | --- |
| First valid key and permitted transition | 200, committed body; Idempotency-Replayed: false |
| Same actor, same key and same canonical request (even after COMMIT response loss) | 200, **original stored JSON body**, Idempotency-Replayed: true |
| Same actor/key with different application, toStatus, expectedVersion or normalized reason | 409 IDEMPOTENCY_KEY_REUSED, no new write |
| Missing key | 428 IDEMPOTENCY_KEY_REQUIRED, no new write |
| Malformed/non-v4 key | 400 INVALID_REQUEST, no new write |
| First-time key but stale expectedVersion | 409 VERSION_CONFLICT, no audit/claim committed |
| Unauthenticated or Viewer write | 401 or 403 before idempotency processing |
| Failed audit insertion | Transaction rollback: no status update, audit or claimed key |

The hash is SHA-256 over an ordered JSON array of [applicationId, toStatus, expectedVersion, trimmed reason/null]. The UUID key is random, not a secret or proof of authorization. **The same key is global to one actor's transitions**: never reuse it for another application or business operation. A fresh business intent needs a new key only after the previous outcome is resolved.

The server also sets **X-Request-ID** for each HTTP request, ignoring caller-supplied correlation IDs. The original successful X-Request-ID is written to the audit event. Replayed HTTP attempts get a fresh X-Request-ID while returning the same original JSON and auditEventId.

A second request with the same key, arriving during an uncommitted first request, waits on the MySQL unique index. It can only see the stored response after the winning transaction COMMIT; if the owner rolls back, another attempt can acquire the key and proceed. No in-process cache is the authority.

### Example

\`\`\`http
POST /api/applications/00000000-0000-4000-8000-000000000101/transitions
Authorization: Bearer <your-in-memory-access-token>
Idempotency-Key: 0b0abda8-2cff-4874-9fe3-55f0cb784a41
Content-Type: application/json

{"toStatus":"Contacted","expectedVersion":1,"reason":"Introductory review"}
\`\`\`

Successful response body:

\`\`\`json
{
  "application": {
    "id": "00000000-0000-4000-8000-000000000101",
    "candidateId": "00000000-0000-4000-8000-000000000001",
    "status": "Contacted",
    "version": 2,
    "updatedAt": "2026-11-18T00:00:00.000Z"
  },
  "auditEventId": "53ff0d9c-9655-4028-bb73-eed2ca31c71b"
}
\`\`\`

Times/IDs in this example are illustrative. Sending **identical headers and body** again with the same valid account will replay the stored result. Sending the same key with a different reason or expectedVersion will return 409 without changing the application.

## Atomicity and schema

Additive migration \`api/migrations/002-idempotency.mjs\` creates \`idempotency_records\` with:
- Unique (actor_id, idempotency_key) as the database-level claim; actor FK and opaque application UUID (no application FK to avoid conflicting parent-row FK locks during concurrent status updates).
- payload_hash, response_body (JSON), original request_id, completed_at, created_at and expires_at.
- Unique-index claim, conditional application UPDATE/version increment, audit INSERT and stored response UPDATE **all in one InnoDB READ COMMITTED transaction**.
- If the transaction is rolled back or the process fails before COMMIT, no claim, status change or audit row remains. If the COMMIT succeeds but the HTTP response is lost, the stored response is available for replay.

**Migration safety:** MySQL DDL implicitly commits. Run migrations separately before deploying updated app code and take appropriate backups. Failed/partial migrations must be inspected and repaired manually. Destructive \`down\`, table drops and forced \`sequelize.sync()\` are not used.

## Browser recovery steps

The API-mode React UI uses Web Crypto \`getRandomValues\` to create one UUID-v4 key for each new transition and keeps the attempt (key + exact original payload) **only in memory**. It never stores JWTs, passwords, keys, or workflow state in localStorage.

On an unknown network/5xx outcome, it freezes new transitions and presents **Retry same request safely**. This manually retries with exactly the original key and body; an already-committed transition returns its original 200 without a duplicate audit. Alternatively, **Refresh server state** reads the application and audit history: if the version has not changed, the original attempt may still be running, so the UI keeps the same-key retry available. If the version changed, the UI clears the pending attempt and lets the user review the new state.

On a definite version conflict (409 VERSION_CONFLICT) or forbidden state change (422), it does not replay; refresh and decide a new action. No automatic POST retry was added.

**Limits:** An in-memory attempt is lost on page reload, panel close, browser crash, or logout. In that situation, users must review authoritative application status and audit history before authoring a new request; the app cannot replay an unknown key after it is lost. PR #7 is not a durable browser retry queue.

## Correlation logging and privacy

Every HTTP response carries server-generated X-Request-ID. Express logs a structured JSON event with **allowlisted** fields only: event, level, requestId, method, templated route, status, durationMs, role and outcome (\`committed\`, \`replay\`, validation failure, etc.). It does **not** log raw URL parameters, body, reason, bearer token, email, user ID, idempotency key, password, or database SQL. Production log shipping, access controls, audit retention and centralized correlation infrastructure remain deployment responsibilities. Test mode suppresses default console logging but can inject a logger to verify redaction.

## Retention, cleanup and rollback

Each key is stored with an expiration timestamp **seven days** after its first claim. Completed records are not purged by HTTP handlers. An operator can deliberately prune up to 500 expired, completed records per invocation:

\`\`\`sh
npm run db:prune-idempotency --prefix api
\`\`\`

Do not run pruning against an unknown database; inspect retained records and operational policy first. **After a record is deleted, the same key could create a new write**; the 7-day window is the retry contract, not an indefinite exactly-once guarantee. In-flight or incomplete records are not pruned. If a previous operation is uncertain after the retention window, investigate server/audit state rather than blindly resend.

A rollback of PR #7 must preserve \`idempotency_records\` or restore a consistent database snapshot. Dropping the table destroys replay protection for committed requests. Schema migrations are additive and do not auto-drop production data.

## Validation and outstanding risk

Real MySQL integration tests exercise matching replay after dropped response, three concurrent requests sharing a key, key/payload mismatch, actor isolation, missing/malformed keys, audit failure rollback, and log redaction. Existing optimistic races and JWT/RBAC tests remain. Frontend Jest tests validate key entropy, the header contract, explicit same-key retries, 409 behavior and session isolation.

Existing dependency alerts, synthetic-only tenant model, non-distributed login limiter, JWT revocation limitations, lack of outbox/external side effects, and offline GitHub Pages deployment are **not** resolved by this PR. The scope is a demonstrable, transactionally safe local hiring workflow.

