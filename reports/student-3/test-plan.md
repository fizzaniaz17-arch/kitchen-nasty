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
| Storefront | Vitest with coverage | Passed: 18 tests across 3 files; output: `evidence/tests/storefront-mobile-menu-unit.txt` |
| Storefront production build | TypeScript and Vite | Passed locally after shared mobile-header controls extraction; latest GitHub CI workspace build also passed |
| Storefront navigation | Playwright, single worker, isolated DB | Passed: 6/6, including heading hierarchy and keyboard menu; outputs: `evidence/tests/playwright-navigation-rerun.txt` and `evidence/tests/storefront-mobile-menu-e2e.txt` |
| Full Playwright E2E | Playwright, single worker, isolated DB | Local run: 142 executed, 138 passed and 4 existing Member 1 reservation tests failed; latest GitHub CI run 45794682485 passed 142/142 |
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
| SonarCloud Quality Gate | Pull request #17, workflow run 45794682540 | Passed: new-code coverage 96.9% (80% minimum), duplicated-line density 0.0% (3% maximum), and 100% of security hotspots reviewed |
| GitHub Actions CI | Branch `hamza-student3-main-sync`, workflow run 45794682485 | Passed: E2E 142/142, server integration and unit tests, security audit, lint/type checks, and workspace builds |
| Mobile Builds CI | Workflow run 45794682552 | Passed |

Test output and machine-readable audit evidence are retained under
[`evidence/`](./evidence/).

## Full Playwright E2E status

The local full suite was run after starting Docker and preparing the isolated
`student3_e2e` database. It completed with 138 passed and 4 failed out of 142.
All four local failures are in
[`e2e/storefront/member1-reservation.spec.ts`](../../e2e/storefront/member1-reservation.spec.ts):
the tests time out while trying to click a disabled `Book Table` button. These
are the previously identified Member 1 reservation cases; their code and
tests were not modified. The latest GitHub Actions run subsequently passed all
142 E2E tests (run 45794682485). The local/CI discrepancy remains documented;
no Member 1 functionality was changed. The local result is retained in
[`evidence/tests/playwright-full-isolated-db-final.txt`](./evidence/tests/playwright-full-isolated-db-final.txt).

The mobile-menu keyboard and state regression passed in the full run and in
the focused navigation run (6/6). The Playwright API web server receives
`NODE_ENV=test`, matching the CI environment and avoiding the production-like
rate limiter during E2E execution. The database is isolated in the
`student3-recovery-pg` container on localhost port 55432; the shared project
database was not started or changed.

## Known blockers and exclusions

- The four Member 1 reservation tests failed in the local isolated run but
  passed in the latest GitHub E2E run. This environment discrepancy is
  recorded; their code and tests were not changed.
- A local Sonar scanner/token was unavailable, but the configured CI analysis
  completed successfully: 96.9% new-code coverage, 0.0% duplication, and a
  passed Quality Gate (run 45794682540).
- Mobile typecheck and Expo iOS/Android bundle exports passed on 2026-11-26;
  fresh output logs are under `evidence/tests/`.
- The configured `npm run lint` command was attempted but could not start:
  `eslint` is not installed or available on PATH. The latest CI lint and
  TypeScript checks passed; no lint dependency was added.
- No production deployment security scan or production performance test was
  performed.
- No assignment-specific performance threshold was supplied; the k6 results
  are measurements, not a pass/fail claim against an invented target.
