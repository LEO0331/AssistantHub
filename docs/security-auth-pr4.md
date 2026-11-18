# AssistantHub 2.0 — PR #4 authentication and RBAC

**Historical scope:** PR #4 introduced JWT login and RBAC for the synthetic-only local Express/MySQL API. **Current post-PR #37 state:** PRs #5–#7 added authenticated hiring transitions, audit history and idempotent replay; PR #8 enforced loopback-only hosting and API security headers. This document retains PR #4's design rationale; consult the [current implementation summary](current-state.md) for today's permissions. No public backend has been deployed.

## Data flow and controls

1. An operator runs the explicit, one-off user provisioning command; there is **no public signup**, sample login, default admin password, or seeded account.
2. Passwords are hashed with Node's asynchronous scrypt (random 16-byte salt, N=16384, r=8, p=1, 64-byte output); only the encoded hash is stored in the users.password_hash column. A dummy hash verification on unknown users reduces obvious timing differences, but is not a complete side-channel guarantee.
3. POST /api/auth/login validates a bounded JSON payload, checks server-side password and user.is_active, and issues a 15-minute HS256 JWT using the maintained `jose` library. JWT includes subject, issuer, audience, issued-at, expiry and jti, but **does not contain a trusted role**.
4. GET /api/auth/me, GET /api/candidates, GET /api/candidates/:id, and GET /api/admin/users/summary require Bearer JWT. Every protected request verifies signature, algorithm, issuer, audience, expiry and the current **database user status and role**; disabling or demoting a user takes effect on the next request even if the token has not expired.
5. RBAC: Viewer/Recruiter/Admin read **synthetic-only** candidates; Admin alone reads aggregate user counts (not email/account lists). **Subsequent PRs #5/#6 implemented** Recruiter/Admin workflow mutations and authenticated audit-history reads. This demo has global role checks but **no tenant/object-ownership enforcement**.
6. Frontend stores the JWT in **React component memory only**, sends Authorization headers with browser credential mode `omit`, never saves credentials/tokens in localStorage or static assets, and resets session on HTTP 401, sign-out, or leaving API mode. There is no refresh-token flow or server-side JWT denylist; immediate logout is local token destruction. Passwords are never logged or stored by the app.
7. Backend CORS allows precisely `API_CORS_ORIGIN`, GET/POST/OPTIONS and Accept/Authorization/Content-Type/**Idempotency-Key**; it exposes `X-Request-ID` and `Idempotency-Replayed` response headers. CORS is not a substitute for authentication. Browser preflight is refused for unmatched origins. No wildcard or credentialed CORS. Health remains public for service monitoring and does not disclose SQL/secrets.

## Permission table

| Operation | Anonymous | Viewer | Recruiter | Admin |
| --- | --- | --- | --- | --- |
| POST /api/auth/login | permitted with throttling | permitted | permitted | permitted |
| GET /api/auth/me | 401 | 200 | 200 | 200 |
| GET /api/candidates, /:id | 401 | 200 | 200 | 200 |
| GET /api/admin/users/summary | 401 | 403 | 403 | 200 |
| POST /api/applications/:id/transitions (PR #5+) | 401 | 403 | 200 if valid | 200 if valid |
| GET /api/applications/:id/audit-events (PR #5+) | 401 | 200 | 200 | 200 |

The existing App.jsx offline demo is deliberately **not** secured by API RBAC and never claims its local status/shortlist is authoritative.

## Credentials and one-time provisioning

Set DB_* environment values and a **unique 32+ byte, high-entropy** AUTH_JWT_SECRET separately from code and from the Vite build. Generate it locally with a cryptographic RNG, e.g.:

    node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"

Do not copy a test or example secret into a deployment. Losing/replacing the secret invalidates currently signed access tokens (no multi-key rotation implementation in this MVP).

Provision one account after migrations, using environment variables (not command-line password arguments, GitHub Actions logs or committed config):

    export BOOTSTRAP_USER_EMAIL='operator@example.test'
    export BOOTSTRAP_USER_ROLE='admin'
    read -rs BOOTSTRAP_USER_PASSWORD
    export BOOTSTRAP_USER_PASSWORD
    npm run user:provision --prefix api
    unset BOOTSTRAP_USER_PASSWORD

The email is a placeholder, not a default account. Provisioning refuses to replace an existing user. Rotate passwords by an explicit, independently reviewed administrative process; there is no account-management API in PR #4.

For local development set `API_CORS_ORIGIN=http://127.0.0.1:3000`, start the API on loopback, and configure Vite with `VITE_ASSISTANTHUB_API_BASE_URL=http://127.0.0.1:3100`. Do not put AUTH_JWT_SECRET or BOOTSTRAP_USER_PASSWORD in any Vite variable.

## Threat model / limitations

- The login limiter tracks **failed attempts per process/IP** (five failures per 15 minutes). This is suitable only for an isolated demo instance. A public, multi-replica deployment requires a centralized, proxy-aware, auditable limiter and explicit abuse monitoring.
- Access tokens are bearer credentials; XSS can steal tokens in memory. Use HTTPS (except localhost development), a strict Content Security Policy in deployment, short token lifetime and standard XSS prevention. No SSR/cookie authentication is used, so browser credential CSRF is not introduced by this flow.
- A single HMAC JWT secret is required; never expose it in browser, commits, CI logs or backups shared without access control. An actual production rollout would need rotation procedures and revocation design beyond user-disable and role checks.
- No organization/tenant model exists. **Object-level multi-tenant authorization cannot be claimed**; only global synthetic candidate RBAC applies. Add ownership/tenant checks when any real candidate data or team scoping is introduced.
- Rate limiting is not a DDoS control; API should not be exposed outside loopback yet. CORS restricts browsers, not curl or unauthorized origin requests by itself.
- PR #4's `jose` dependency is already integrity-locked and covered by API CI. The historical dependency assessment is preserved separately; passing the high/critical production audit gate does not mean full dependency audit warnings are resolved.
- PR #4 originally shipped no state-changing business endpoint; **PR #5 subsequently added** protected application transitions and append-only-over-HTTP audits. The admin-only users/summary endpoint still returns aggregates, not emails, hashes or credentials.

## Required verification

- JWT invalid signature, wrong issuer/audience, expiry, malformed Authorization and disabled-account checks produce 401.
- Viewer/recruiter denied admin aggregation with 403; admin permitted; database role demotion takes effect immediately.
- Invalid password/nonexistent account have the same generic 401 JSON; failed-login rate limit returns 429 and Retry-After.
- Invalid/malformed or oversized JSON rejected without raw SQL or credential disclosure.
- CORS exact-origin preflight; unauthorized candidate requests rejected before SQL.
- Real MySQL integration tests and candidate pagination continue passing, plus existing frontend Jest/coverage, build, tooling, Lighthouse and both dependency audit reporting/gates.

Reviewers should treat these controls as **interview/demo baseline**, not a production banking-grade identity system.
