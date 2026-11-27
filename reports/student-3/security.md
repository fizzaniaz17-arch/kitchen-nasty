# Student 3 Security Testing Report

## Scope

Security evaluation covered dependency vulnerabilities, security response headers, social-authentication token handling, authorization regression coverage, and reservation ownership checks.

## Dependency audit

| Audit scope | Initial findings | Final findings |
|---|---:|---:|
| Full dependency tree | 95 | 22 |
| Production dependencies | 62 | 20 |
| Server production dependencies | Not recorded separately | 0 |

The final full audit contains 0 critical, 1 high, and 21 moderate findings. The production-only audit contains 0 critical, 1 high, and 19 moderate findings.

The remaining high finding is associated with image-size in the Expo 52 / Metro dependency chain. A direct upgrade was deferred because the patched major version changes the API expected by the installed Metro version. Remaining moderate findings are primarily transitive tooling dependencies.

Detailed advisory analysis and remediation decisions are documented in `../../docs/sqe/student-3/dependency-audit.md`.

## Security headers

The admin, storefront, and documentation Nginx configurations define:

- Content-Security-Policy: `frame-ancestors 'none'`
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Referrer-Policy: `no-referrer`

Automated browser response-header checks passed for the admin and storefront applications. Local development responses were also inspected.

A production Nginx deployment was not tested. The CSP is intentionally limited to anti-framing because a complete resource allowlist was not established.

## Social authentication

The social-auth callback was changed to avoid placing a JWT in the redirect URL. The flow uses a short-lived, single-use authorization code exchanged through the server endpoint.

Integration tests cover expiry, replay, and state-cookie handling. A browser regression test verifies that the code is exchanged and removed from the visible URL.

The code and state stores are process-local. Multi-instance deployments require sticky routing or shared storage.

## Authorization and reservation ownership

The server integration suite includes authentication, reservation ownership/IDOR, and staff-role authorization regression coverage. These checks passed as part of the recorded server integration test suite.

The separate security browser regression checks also passed: 3 tests.

## Overall validation

- Full dependency audit: 22 findings.
- Production dependency audit: 20 findings.
- Server production audit: 0 findings.
- Security browser regressions: 3 passed.
- Server integration suite: 344 passed within the final 421-test `npm test` run.

## Limitations

- No post-remediation passive ZAP scan was performed.
- Production Nginx behavior was not verified.
- No production deployment or real customer credentials were used.
- The remaining Expo dependency findings require coordinated compatibility work.

See `../../docs/sqe/student-3/security-remediation.md` and `../../docs/sqe/student-3/dependency-audit.md` for detailed evidence and decisions.
