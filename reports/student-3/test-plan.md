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
| Storefront | Vitest with coverage | Passed: 5 tests across 2 files; final output: `evidence/tests/storefront-coverage-final.txt` |
| Storefront production build | TypeScript and Vite | Passed after mobile-header accessibility updates |
| Storefront navigation | Playwright, single worker, isolated DB | Passed: 6/6, including heading hierarchy and keyboard menu; output: `evidence/tests/playwright-navigation-rerun.txt` |
| Full Playwright E2E | Playwright, single worker, isolated DB | 142 executed: 138 passed, 4 failed; all four are existing Member 1 reservation tests; output: `evidence/tests/playwright-full-isolated-db-final.txt` |
| Targeted security/navigation browser tests | Playwright, single worker (2026-11-26) | Passed: 9/9 response-header, navigation, and social-auth callback checks |
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

The full suite was run after starting Docker and preparing the isolated
`student3_e2e` database. It completed with 138 passed and 4 failed out of 142.
All four failures are in
[`e2e/storefront/member1-reservation.spec.ts`](../../e2e/storefront/member1-reservation.spec.ts):
the tests time out while trying to click a disabled `Book Table` button. These
are the previously identified Member 1 reservation cases; their code and
tests were not modified. No other test failed. The complete result is retained
in [`evidence/tests/playwright-full-isolated-db-final.txt`](./evidence/tests/playwright-full-isolated-db-final.txt).

The mobile-menu keyboard and state regression passed in the full run and in
the focused navigation run (6/6). The Playwright API web server receives
`NODE_ENV=test`, matching the CI environment and avoiding the production-like
rate limiter during E2E execution. The database is isolated in the
`student3-recovery-pg` container on localhost port 55432; the shared project
database was not started or changed.

## Known blockers and exclusions

- Four known Member 1 reservation tests still fail; resolving them would
  require authorization to modify that member's test or application scope.
- Sonar server analysis was not run because no local scanner or token was
  available. The branch CI/Sonar result should be checked after pushing.
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
