# Student 3 Security Remediation Report

## Scope and outcome

This report covers the security-header findings, social-auth token exposure, and dependency audit for the `hamza` branch of `fizzaniaz17-arch/kitchen-nasty`. The separate PostgreSQL recovery work used an isolated database and synthetic data; its full results are in [`reports/student-3/recovery.md`](../../../reports/student-3/recovery.md). The shared project database was not changed.

The header and social-auth changes are committed on this branch. PR [#7](https://github.com/fizzaniaz17-arch/kitchen-nasty/pull/7) targets `main` and remains open; it has not been merged. Automated checks and local UI captures below are supporting evidence; they do not represent a production deployment or a post-remediation ZAP rescan.

## Security headers

The admin, storefront, and documentation Nginx configurations set:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |

Admin and storefront Vite development servers return the same four headers. Playwright response-header checks passed for both applications. Local `GET /` responses also returned each header with the values above.

The CSP deliberately limits itself to anti-framing. A full resource allowlist was not added because script, style, image, API, payment, and other external resource sources have not been inventoried. Live Nginx behavior was not verified in a running production container.

## Social authentication

The callback no longer places a JWT in its redirect URL. It returns a short-lived, single-use authorization code, bound to browser OAuth state, and the storefront exchanges that code through `POST /api/auth/social/exchange`. The server validates state, expires codes after 60 seconds, and disables caching/referrer leakage on callback and exchange responses. Caller-controlled mobile redirect selection was removed.

Integration coverage checks code expiry/replay and state-cookie handling. The browser regression confirms the callback exchanges a code, removes it from the visible URL, and reaches the authenticated account screen.

The state and code stores are process-local. Multi-instance deployments need sticky routing for the complete flow or shared storage. Social callbacks currently redirect to the storefront; the mobile app does not yet include a native social-login launcher.

## Validation evidence

| Check | Result |
|---|---|
| Shared and server unit/integration suites (`npm test`) | 421 passed (17 shared, 60 unit, 344 integration) |
| Member 1 coverage gate | 56 passed; 100% statements, branches, functions, and lines |
| Member 1 mutation gate | 64.93%; above the 60% break threshold |
| Full server suite used for Sonar LCOV | 460 passed |
| Storefront social-auth regression tests | 5 passed |
| Security-header and social-callback Playwright checks | 3 passed |
| Full Playwright E2E run | 135 passed; 5 failed in existing Member 1 reservation-fixture and parallel footer tests. The footer test passed when rerun alone. |
| Mobile TypeScript check | Passed |
| Expo public configuration smoke check | Passed |
| iOS and Android Expo bundle exports | Passed |
| Server TypeScript build | Passed |
| Shared, server, admin, and storefront production builds | Passed |
| Documentation build | Passed with VitePress 1.6.4 and Vite 6.4.6 |
| Local admin/storefront response-header inspection | All four expected headers present |
| Sonar LCOV preparation | Server and storefront reports generated; 62 server and 2 storefront source paths normalized to repository-relative paths |
| Local lint script | Blocked: `npm run lint` fails because the configured `eslint` executable is not installed in this checkout |

### Sonar coverage follow-up

The previous SonarCloud run reported 2.5% new-code coverage because its newer analysis-scope behavior ignored the repository's `sonar.sources`, `sonar.tests`, and `sonar.test.inclusions` settings, while CI supplied only the Member 1 LCOV report. The analysis consequently treated out-of-scope mobile and E2E/test files as production source.

The workflow excludes those test and out-of-scope directories without changing the quality-gate threshold. It generates server and storefront LCOV reports and normalizes their paths to the repository root. The local path checks passed. The remote Sonar checks have not passed: the latest observed PR run still reports failures and targets remote head `9d7bd95`. Local `hamza` is now ahead with `c1c46b1` and `fbb3c31`, plus uncommitted documentation and evidence. A new PR run is required before claiming a Sonar pass.

The callback screenshot uses stubbed API responses and a synthetic test identity. No real OAuth provider, JWT, or customer data was used. UI screenshots show local development views only.

### Admin sign-in

![Admin sign-in with empty fields; local development screenshot.](../../../reports/student-3/security/evidence/admin-sign-in.png)

### Storefront

![Storefront home page; local development screenshot.](../../../reports/student-3/security/evidence/storefront-home.png)

### Social-auth callback success

![Authenticated storefront account after exchanging a synthetic one-time code.](../../../reports/student-3/security/evidence/social-login-success.png)

## Audit summary

The full audit decreased from 95 findings (6 critical, 50 high, 31 moderate, 8 low) to 22 (0 critical, 1 high, 21 moderate). The production-only audit decreased from 62 (3 critical, 31 high, 26 moderate, 2 low) to 20 (0 critical, 1 high, 19 moderate). The server production workspace has no remaining audit findings.

The remaining high finding is `image-size` in the Expo 52 / Metro 0.81.5 dependency tree. The advisory affects parsing of crafted JXL/HEIF and ICNS files. Metro calls the parser on project asset bytes, so an attacker-controlled asset could cause a build/dev-process availability failure; this is not a production server-runtime path. The patched `image-size` 2.0.3 API is incompatible with Metro 0.81.5's direct CommonJS function call, so it was not forced across that boundary. The remaining moderate findings are transitive Expo/Metro tooling advisories; their reachability and compatible-fix decisions are documented in the dependency audit report.

## Evidence and limitations

- Baseline and final npm audit JSON files are in `reports/student-3/security/`.
- The security-header, social-auth, and dependency-audit commits are on `hamza`; PR #7 is open for review and has not been merged. Do not treat its current remote check status as validation of unpushed local work.
- No post-remediation ZAP scan or production Nginx container test was run.
