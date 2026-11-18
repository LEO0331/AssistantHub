# AssistantHub 2.0 — PR #4 authentication and RBAC

**Scope:** protect the locally runnable, synthetic-only Express/MySQL candidate API. The current offline/local/mock browser remains unchanged. PR #5 will enforce server-side hiring transitions/audit; this PR introduces no such mutations. Nothing in PR #4 deploys a public backend.

## Data flow and controls

1. An operator runs the explicit, one-off user provisioning command; there is **no public signup**, sample login, default admin password, or seeded account.
2. Passwords are hashed with Node's asynchronous scrypt (random 16-byte salt, N=16384, r=8, p=1, 64-byte output); only the encoded hash is stored in the users.password_hash column. A dummy hash verification on unknown users reduces obvious timing differences, but is not a complete side-channel guarantee.
3. POST /api/auth/login validates a bounded JSON payload, checks server-side password and user.is_active, and issues a 15-minute HS256 JWT using the maintained \`jose\` library. JWT includes subject, issuer, audience, issued-at, expiry and jti, but **does not contain a trusted role**.
4. GET /api/auth/me, GET /api/candidates, GET /api/candidates/:id, and GET /api/admin/users/summary require Bearer JWT. Every protected request verifies signature, algorithm, issuer, audience, expiry and the current **database user status and role**; disabling or demoting a user takes effect on the next request even if the token has not expired.
5. RBAC: viewer/recruiter/admin can read *synthetic-only* candidates; **admin only** can read aggregated user counts (no email/account list). Recruiter workflow mutations and audit history will be added in PR #5, with server-side authorization and resource-level checks.
6. Frontend stores the JWT in **React component memory only**, sends Authorization headers with browser credential mode \`omit\`, never saves credentials/tokens in localStorage or static assets, and resets session on HTTP 401, sign-out, or leaving API mode. There is no refresh-token flow or server-side JWT denylist; immediate logout is local token destruction. Passwords are never logged or stored by the app.
7. Backend CORS allows precisely API_CORS_ORIGIN and only GET/POST/OPTIONS plus Accept/Authorization/Content-Type; it is not a substitute for authentication. Browser preflight is refused for unmatched origins. No wildcard or credentialed CORS. Health remains public for service monitoring and does not disclose SQL/secrets.

## Permission table

| Operation | Anonymous | Viewer | Recruiter | Admin |
| --- | --- | --- | --- | --- |
| POST /api/auth/login | permitted with throttling | permitted | permitted | permitted |
| GET /api/auth/me | 401 | 200 | 200 | 200 |
| GET /api/candidates, /:id | 401 | 200 | 200 | 200 |
| GET /api/admin/users/summary | 401 | 403 | 403 | 200 |
| Transition an application | not implemented | not implemented | not implemented | not implemented |

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

For local development set \`API_CORS_ORIGIN=http://127.0.0.1:3000\`, start the API on loopback, and configure Vite with \`VITE_ASSISTANTHUB_API_BASE_URL=http://127.0.0.1:3100\`. Do not put AUTH_JWT_SECRET or BOOTSTRAP_USER_PASSWORD in any Vite variable.

## Threat model / limitations

- The login limiter tracks **failed attempts per process/IP** (five failures per 15 minutes). This is suitable only for an isolated demo instance. A public, multi-replica deployment requires a centralized, proxy-aware, auditable limiter and explicit abuse monitoring.
- Access tokens are bearer credentials; XSS can steal tokens in memory. Use HTTPS (except localhost development), a strict Content Security Policy in deployment, short token lifetime and standard XSS prevention. No SSR/cookie authentication is used, so browser credential CSRF is not introduced by this flow.
- A single HMAC JWT secret is required; never expose it in browser, commits, CI logs or backups shared without access control. An actual production rollout would need rotation procedures and revocation design beyond user-disable and role checks.
- No organization/tenant model exists. **Object-level multi-tenant authorization cannot be claimed**; only global synthetic candidate RBAC applies. Add ownership/tenant checks when any real candidate data or team scoping is introduced.
- Rate limiting is not a DDoS control; API should not be exposed outside loopback yet. CORS restricts browsers, not curl or unauthorized origin requests by itself.
- Existing dependency audit findings from PR #23/#24 remain tracked separately. Adding \`jose\` requires a newly committed integrity-pinned API lockfile, full CI and an unchanged high/critical production audit gate.
- No role-changing or state-changing HTTP endpoint is implemented in PR #4. The admin-only users/summary endpoint returns aggregates, never emails, hashes or credentials.

## Required verification

- JWT invalid signature, wrong issuer/audience, expiry, malformed Authorization and disabled-account checks produce 401.
- Viewer/recruiter denied admin aggregation with 403; admin permitted; database role demotion takes effect immediately.
- Invalid password/nonexistent account have the same generic 401 JSON; failed-login rate limit returns 429 and Retry-After.
- Invalid/malformed or oversized JSON rejected without raw SQL or credential disclosure.
- CORS exact-origin preflight; unauthorized candidate requests rejected before SQL.
- Real MySQL integration tests and candidate pagination continue passing, plus existing frontend Jest/coverage, build, tooling, Lighthouse and both dependency audit reporting/gates.

Reviewers should treat these controls as **interview/demo baseline**, not a production banking-grade identity system.
