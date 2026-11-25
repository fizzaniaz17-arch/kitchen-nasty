# Student 3 Security Testing Report

## Scope

Security evaluation covered dependency vulnerabilities, security response headers, social-authentication token handling, authorization regression coverage, and reservation ownership checks.

## Dependency audit

| Audit scope | Initial findings | Final findings |
|---|---:|---:|
| Full dependency tree | 95 | 23 (current recheck) |
| Production dependencies | 62 | 21 (current recheck) |
| Server production dependencies | Not recorded separately | 0 |

The current full audit contains 0 critical, 1 high, and 22 moderate findings.
The combined production-only audit contains 0 critical, 1 high, and 20
moderate findings. The server production workspace audit contains no findings.
The audit includes all workspaces, including the Expo mobile dependency tree;
the server production workspace result is separate.

The remaining high finding is associated with `image-size` 1.2.1 in the Expo
52 / Metro 0.81.5 dependency chain. The advisory concerns denial of service
while Metro parses crafted images during development/build; it is not a
production server-runtime path. The audited dependency metadata identifies
`image-size` 2.0.3 as fixed, but Metro 0.81.5 expects the 1.x CommonJS API.
The automated `npm audit fix --dry-run` attempt failed inside npm 10.9.8's
Arborist (`Cannot read properties of null (reading 'edgesOut')`), so no
dependency changes were attempted. The Expo 58 and i18next 27 fixes proposed
by the audit are semver-major updates; they were not applied.

Detailed advisory analysis and remediation decisions are documented in `../../docs/sqe/student-3/dependency-audit.md`.

## Security headers

The admin, storefront, and documentation Nginx configurations define:

- Content-Security-Policy: `frame-ancestors 'none'`
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Referrer-Policy: `no-referrer`

Automated browser response-header checks passed for the admin and storefront
applications. On 2026-11-26, the targeted single-worker Playwright rerun passed
9/9 navigation, heading, keyboard-menu, response-header, and social-auth
callback tests. The API process also logged a missing `DATABASE_URL` during
the run; database-backed flows were not part of this targeted result.

A production Nginx deployment was not tested. The CSP is intentionally limited to anti-framing because a complete resource allowlist was not established.

## Social authentication

The social-auth callback was changed to avoid placing a JWT in the redirect URL. The flow uses a short-lived, single-use authorization code exchanged through the server endpoint.

Integration tests cover expiry, replay, and state-cookie handling. A browser regression test verifies that the code is exchanged and removed from the visible URL.

The code and state stores are process-local. Multi-instance deployments require sticky routing or shared storage.

## Authorization and reservation ownership

The server integration suite includes authentication, reservation ownership/IDOR, and staff-role authorization regression coverage. These checks passed as part of the recorded server integration test suite.

The response-header and social-auth browser cases account for 3 of the 9
targeted Playwright tests passed on 2026-11-26.

## Overall validation

- Full dependency audit (2026-11-26): 23 findings (0 critical, 1 high,
  22 moderate).
- Combined production dependency audit (2026-11-26): 21 findings (0 critical,
  1 high, 20 moderate).
- Server production audit: 0 findings.
- Security/navigation browser regressions: 9 passed in the targeted rerun.
- Shared/server `npm test`: 421 passed (17 shared, 60 server unit, 344 server
  integration); storefront tests: 5 passed.
- Independent review found no confirmed exploitable vulnerability in the
  reviewed Student 3 code changes. The remaining high `image-size` advisory is
  a conditional Metro development/build-time denial-of-service risk; the CSP
  and other header gaps are hardening recommendations, not demonstrated
  injection or authentication exploits.

## Passive OWASP ZAP baseline

A real Docker-based OWASP ZAP 2.17.0 baseline pass was executed against
`http://192.168.100.72:5174/`. It crawled 7 URLs and reported zero failures.

Retained report formats:

- `evidence/security/zap-baseline-final.html`
- `evidence/security/zap-baseline-final.json`
- `evidence/security/zap-baseline-final.md`

| Risk | Alerts | Assessment |
|---|---:|---|
| High | 0 | No high-risk alerts in the passive baseline. |
| Medium | 4 | Four CSP checks flag the configured policy `frame-ancestors 'none'` as incomplete. This is a genuine limitation: it prevents framing but does not restrict scripts, styles, or other resource sources. ZAP's labels for wildcard/`unsafe-inline` are inferred from absent directives; those literal tokens are not present in the header evidence. |
| Low | 4 | Missing Permissions Policy and COEP/COOP/CORP headers. These are defense-in-depth recommendations. COEP/COOP can affect cross-origin assets and popup-based OAuth; choose values only after deployment compatibility review. |
| Informational | 2 | Vite's React-refresh bootstrap identifies a development server; `no-cache` responses are expected for development assets. Neither finding demonstrates a production vulnerability. |
| Total | 10 | 63 passive rules passed; no active scan or destructive attack was performed. |

The three Nginx configs were inspected: admin and storefront set only the same
anti-framing CSP, while docs repeats it. These findings are therefore not
dismissed as ZAP false positives for production; the source policy is
intentionally limited and needs a resource-aware CSP before a production
security claim. The ZAP run itself used Vite development mode, so its HMR and
cache observations are not representative of the built Nginx deployment.

## Limitations

- ZAP scanned only the local storefront development server, not production
  Nginx or external systems.
- Docker's Linux engine was unavailable on 2026-11-26 (the Docker API named
  pipe did not exist). `C:` had 9.72 GB free and `D:` had 15.68 GB free; the
  previous low-space condition is no longer present. No PostgreSQL service or
  executable was available, and ports 5432, 55432, and 55433 were not
  listening. Database-dependent full E2E reruns therefore remain blocked.
  Docker's configured WSL data disk remains on `D:`; no Docker reset or data
  deletion was performed.
- No production deployment or real customer credentials were used.
- The remaining Expo dependency findings require coordinated compatibility work.

See `../../docs/sqe/student-3/security-remediation.md` and `../../docs/sqe/student-3/dependency-audit.md` for detailed evidence and decisions.
