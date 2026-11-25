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
| Storefront | Vitest with coverage | Passed: 5 tests across 2 files |
| Storefront navigation | Playwright | Passed: 6 tests, including heading hierarchy and keyboard menu checks |
| Browser security regressions | Admin/storefront security-header checks and social-auth callback | Passed: 3 tests in the recorded isolated run; see [`security-e2e.txt`](./security-e2e.txt) |
| Accessibility | Lighthouse and axe-core | Lighthouse 98/100 to 100/100; axe violations 1 moderate to 0 |
| Performance | k6 against local `/api/health` | Four runs completed; 0% failed requests; raw summaries retained |
| Passive security | OWASP ZAP baseline against local storefront | 7 URLs; 0 high, 4 medium, 4 low, 2 informational alerts |
| PostgreSQL recovery | Isolated container test | Migration, outage handling after fix, reconnection, backup/restore, and integrity results documented in `recovery.md` |
| Sonar coverage inputs | `sonar-project.properties` and LCOV paths | Server and storefront LCOV paths resolve to existing files; no Sonar server analysis was run |

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
current checkout. The four reservation failures could not be reconfirmed
because the database-backed suite is currently blocked. No Member 1 tests or
functionality were modified.

## Known blockers and exclusions

- Docker Desktop's WSL engine is unavailable. At the last inspection, `C:`
  had about 0.15 GB free and the configured Docker data VHDX remained on `D:`.
  The Docker data disk was not deleted or factory-reset.
- The full Playwright suite must be rerun after Docker is recovered and the
  isolated test database is available.
- Mobile typecheck and Expo iOS/Android bundle exports were not rerun during
  this final verification because the system drive has critically low free
  space. The previous report's pass claims are not treated as current results
  without fresh output evidence.
- Sonar server analysis was not run. The configured server and storefront
  LCOV input files exist; an actual analysis still requires the normal CI or
  Sonar environment.
- ESLint was not installed in the checkout, so lint could not be run.
- No production deployment security scan or production performance test was
  performed.
- No assignment-specific performance threshold was supplied; the k6 results
  are measurements, not a pass/fail claim against an invented target.
