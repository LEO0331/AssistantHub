# PR #6 — Authenticated React hiring workflow and audit timeline

This is the **first functional full-stack MVP when running locally**, not a public production deployment. GitHub Pages still defaults to the original offline demo and does not host the Express/MySQL API. No real applicant data or shared writable public account should be used.

## End-to-end data flow

1. Run the separate Express backend with migrated MySQL and deterministic synthetic seed data. Provision Viewer, Recruiter, and Admin accounts explicitly using the PR #4 operator-only command; no default passwords are created.
2. Set API_CORS_ORIGIN to the exact local Vite frontend origin and configure the frontend with the public (nonsecret) VITE_ASSISTANTHUB_API_BASE_URL, as documented in api/README.md. Never expose AUTH_JWT_SECRET or passwords through Vite.
3. Select **Real MySQL API (authenticated workflow)** and sign in. The 15-minute JWT exists only in React component memory and is sent with Authorization headers (credentials: omit). Sign-out, leaving API mode or HTTP 401/403 clears the session.
4. Search/filter and select a synthetic candidate. GET /api/candidates/:id/application retrieves the **actual** MySQL application ID, status, version, and update time. Do not infer an application ID from the synthetic candidate ID or use browser localStorage as authority.
5. GET /api/applications/:id/audit-events?page=1&pageSize=10 retrieves the server-generated, chronological audit history; the UI exposes bounded paging and does not manufacture activity.
6. Viewer is read-only. Recruiter/Admin can choose only transitions suggested by the state machine in the client, but the API repeats authorization and validation. The UI sends only { toStatus, expectedVersion, reason } to POST /api/applications/:id/transitions.
7. After a confirmed HTTP 200, the React panel reloads the application and audit history from MySQL. The business status does **not** change optimistically in the browser before the server confirms its transaction.

## Authorization and state transition summary

| Role | Candidate/application/audit reads | Hiring transition |
| --- | --- | --- |
| Viewer | Allowed | Forbidden (403 enforced by backend) |
| Recruiter | Allowed | Allowed if version and state machine permit |
| Admin | Allowed | Allowed if version and state machine permit |

New → Contacted → Interview → Hired, and Rejected is allowed from any nonterminal state. Hired and Rejected are terminal. The UI is a usability layer, not an authorization boundary; the backend's current-database-user/JWT checks and conditional InnoDB UPDATE determine the result.

## Failure recovery (critical)

| Situation | UI behavior | Database guarantee |
| --- | --- | --- |
| HTTP 200 | Display committed response, refetch server application and audit | PR #5 transaction committed before response |
| HTTP 409 | Freeze further status changes and show refresh action | Stale expectedVersion makes no write |
| HTTP 422 | Freeze and require fresh status to review valid transitions | Forbidden current-state transition makes no write |
| Timeout, broken connection or HTTP 5xx | **Do not replay POST.** Freeze and prompt manual refresh | Outcome may be unknown until application/history GET |
| HTTP 401 or 403 | Clear in-memory session; request fresh sign-in | Auth/role enforced on the server |
| Candidate/filter/page change or sign-out | Cancel/ignore stale GET requests, close selected workflow | No client-side workflow write is implied |

The **Refresh server state** control retrieves both application and audit again before enabling a new transition. It is deliberately not an automatic POST retry. PR #7 will add durable idempotency keys and replay logic for unknown-outcome retries; until then, inspect the committed state after network errors.

## Security and operational limitations

- Synthetic-only, single-tenant data, no production backend hosting, no shared public writable account, no demo credentials embedded in the UI. Real applicants require object-level authorization and privacy design.
- No new schema migration, frontend dependency, lockfile change, or GitHub Pages configuration change in PR #6.
- No append-only database grants, outbox, distributed login throttling, durable request idempotency, or token revocation list in this milestone. The JWT's 15-minute expiry and current-user account checks remain as implemented in PR #4.
- A browser with XSS can steal an in-memory bearer token; this is not a production banking identity design.
- Frontend tests validate behavior/contract; real MySQL concurrency and rollback are still covered by the PR #5 integration suite. New backend MySQL integration verifies candidate-to-application lookup, including authentication and 404.
- Existing dependency security findings remain open. A green CI or Lighthouse result is not proof of a clean dependency tree.

## Reviewer demo

Use an operator-provisioned Viewer to open a candidate and verify the server status/audit without a mutation form. Use a Recruiter to advance one synthetic application from New to Contacted; verify the returned version increased and one audit event appeared. Simulate a competing change with another authenticated user, then verify that the losing UI receives HTTP 409, freezes writes, and requires an explicit refresh. Switch back to local/mock modes to confirm they still behave as the offline demo and are not claimed to be persisted on MySQL.

See [PR #5 workflow review](workflow-audit-pr5.md), [API contract](api-contract.md), and [PR #4 authentication review](security-auth-pr4.md) for the server invariants and security boundaries.
