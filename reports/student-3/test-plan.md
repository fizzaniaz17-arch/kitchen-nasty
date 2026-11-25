# Student 3 Test Plan and Results

## Test environment and safety

The database recovery exercise used an isolated PostgreSQL 16 container bound
to `127.0.0.1:55432`, synthetic test records, and a separate named volume.
The shared `kitchenasty-db` container and its volume were not used or changed.
See [`recovery.md`](./recovery.md) for the recorded migration, outage,
reconnection, backup, restore, and integrity results.

The accessibility, performance, and passive ZAP checks targeted local
development services. The ZAP run was passive only; no external or production
target was scanned.

## Current validation results

| Area | Validation | Result |
|---|---|---|
| Shared | Vitest | Passed: 17 tests |
| Server unit | Vitest | Passed: 60 tests |
| Server integration | Vitest | Passed: 344 tests across 23 files |
| Full server coverage / Sonar LCOV | Vitest with V8 coverage | Passed: 463 tests across 29 files; generated `packages/server/coverage/sonar/lcov.info`; output: `evidence/tests/server-coverage-rerun.txt` |
| Storefront | Vitest with coverage | Passed: 5 tests across 2 files |
| Storefront navigation and browser security | Targeted Playwright, single worker (2026-11-26) | Passed: 9 tests covering navigation, heading hierarchy, keyboard menu, response headers, and social-auth callback; API logged missing `DATABASE_URL`, so DB-backed flows were excluded |
| Accessibility | Lighthouse and axe-core | Lighthouse 98/100 to 100/100; axe violations 1 moderate to 0 |
| Performance | k6 against local `/api/health` | Four runs completed; 0% failed requests; raw summaries retained |
| Passive security | OWASP ZAP baseline against local storefront | 7 URLs; 0 high, 4 medium, 4 low, 2 informational alerts |
| PostgreSQL recovery | Isolated container test | Migration, outage handling after fix, reconnection, backup/restore, and integrity results documented in `recovery.md` |
| Mobile | TypeScript check | Passed; output: `evidence/tests/mobile-typecheck-rerun.txt` |
| Mobile Android export | Expo bundle export | Passed; output: `evidence/tests/mobile-android-export-rerun.txt` |
| Mobile iOS export | Expo bundle export | Passed; output: `evidence/tests/mobile-ios-export-rerun.txt` |
| Workspace production build | Shared, server, admin, storefront | Passed; admin emitted a 904 kB minified-chunk warning; output: `evidence/tests/workspace-build-rerun.txt` |
| Full npm audit (2026-11-26) | All workspaces | 23 findings: 0 critical, 1 high, 22 moderate |
| Production npm audit (2026-11-26) | All production dependencies | 21 findings: 0 critical, 1 high, 20 moderate |
| Server production audit (2026-11-26) | Server workspace | 0 findings |
| Sonar coverage inputs | `sonar-project.properties` and LCOV paths | Server and storefront LCOV paths exist; no local Sonar scanner or token was available, so server analysis was not run |

Test output and machine-readable audit evidence are retained under
[`evidence/`](./evidence/).

## Full Playwright E2E status

The current checkout's full suite was not completed. A diagnostic attempt
started 142 tests with one worker and an intentionally unavailable database at
`127.0.0.1:59999`. The first admin coupon flow triggered a Prisma connection
failure, confirming that the suite requires a working test database. The
attempt was stopped rather than allowing repeated, predictable DB failures.
See [`evidence/tests/playwright-full-no-db-result.md`](./evidence/tests/playwright-full-no-db-result.md)
and the raw console output in
[`evidence/tests/playwright-full-no-db.txt`](./evidence/tests/playwright-full-no-db.txt).

A prior full-run record in [`e2e-full.txt`](./e2e-full.txt) reported 135
passed and 5 failed: four existing Member 1 reservation tests failed because
their `/api/auth/me` mock returned a different shape than the storefront
expects; a footer visibility test detached during the multi-worker run and
passed when isolated. This is historical evidence, not a result from the
current checkout. The four reservation failures could not be reconfirmed because the
database-backed suite is currently blocked. No Member 1 tests or functionality
were modified. The 2026-11-26 targeted run passed 9 database-independent
navigation/security tests; its output is in
[`evidence/tests/playwright-security-navigation-rerun.txt`](./evidence/tests/playwright-security-navigation-rerun.txt).

## Known blockers and exclusions

- Docker's Linux engine was unavailable on 2026-11-26 although `C:` had
  9.72 GB free. The isolated PostgreSQL container could not be started; no
  PostgreSQL service or executable was available and ports 5432, 55432, and
  55433 were not listening. The Docker data disk remains on `D:` and was not
  deleted or factory-reset.
- The full Playwright suite must be rerun after Docker is recovered and the
  isolated test database is available.
- Mobile typecheck and Expo iOS/Android bundle exports passed on 2026-11-26;
  fresh output logs are under `evidence/tests/`.
- Sonar server analysis was not run. Both configured LCOV files now exist;
  an actual analysis still requires the normal CI or Sonar environment.
- The configured `npm run lint` command was attempted but could not start:
  `eslint` is not installed or available on PATH. No lint dependency was added.
- No production deployment security scan or production performance test was
  performed.
- No assignment-specific performance threshold was supplied; the k6 results
  are measurements, not a pass/fail claim against an invented target.
