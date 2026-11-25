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

The remaining high finding is associated with `image-size` 1.2.1 in the Expo 52
/ Metro 0.81.5 dependency chain. The advisory concerns denial of service while
Metro parses crafted images during development/build; it is not a production
server-runtime path. A direct upgrade was deferred because the patched major
version changes the API expected by the installed Metro version. Remaining
moderate findings are primarily transitive tooling dependencies.

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
- Docker Desktop is currently stopped after WSL `vpnkit-bridge` handshake
  failure (`ERROR_NETNAME_DELETED`). At final inspection, `C:` had about
  0.15 GB free and `D:` had 26.23 GB free. The Docker service and engine were
  unavailable; Docker's configured WSL data disk remains present at
  `D:\DockerData\DockerDesktopWSL\disk\docker_data.vhdx` (11.9 GB). No Docker
  factory reset or data deletion was performed. Database-dependent E2E
  reruns remain blocked until Windows disk space is freed and Docker is healthy.
- No production deployment or real customer credentials were used.
- The remaining Expo dependency findings require coordinated compatibility work.

See `../../docs/sqe/student-3/security-remediation.md` and `../../docs/sqe/student-3/dependency-audit.md` for detailed evidence and decisions.
