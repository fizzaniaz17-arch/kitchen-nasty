# Student 3 Final Test Plan and Results

## Test environment

Unit and integration tests ran from the `hamza` checkout. Browser E2E tests
used a fresh, isolated PostgreSQL database named `student3_recovery_e2e` on
the localhost-only recovery container, with synthetic seed data. No shared or
production database was used. The recovery database, outage, and backup/restore
results are documented in [`recovery.md`](./recovery.md).

## Results

| Area | Validation | Result |
|---|---|---|
| Shared and server | `npm test` | Passed: 17 shared, 60 server unit, and 344 server integration tests (421 total) |
| Server coverage | Full Vitest run with LCOV | Passed: 460 tests across 29 files |
| Member 1 coverage gate | `npm run coverage:member1` | Passed: 56 tests; 100% statements, branches, functions, and lines |
| Storefront | Vitest with coverage | Passed: 5 tests |
| Authorization and security regressions | Included in server integration suite: auth, reservation IDOR, staff-role gates, social auth, and security validation | Passed as part of the 344 integration tests |
| Browser security regressions | Admin/storefront security-header checks and social-auth callback | Passed: 3 tests |
| Full Playwright E2E | All configured admin and storefront tests, one attempt with four workers | 135 passed, 5 failed; see findings below |
| Mobile | TypeScript check | Passed |
| Mobile | Expo iOS and Android bundle exports | Passed |
| Web/server | Shared, server, admin, and storefront builds | Passed; admin build emitted a non-failing large-chunk warning |
| Documentation | VitePress production build | Passed |
| Sonar inputs | Server/storefront LCOV generation and repository-relative path checks | Passed: 62 server and 2 storefront source records |
| Dependency audit | Full / production-only / server-production | 22 / 20 / 0 findings; see [`dependency-audit.md`](../../docs/sqe/student-3/dependency-audit.md) |
| Lint | `npm run lint` | Blocked: `eslint` is not installed in this checkout |

The full server coverage run was repeated serially after one authentication
test exceeded its 10-second limit during a concurrent build/export run. The
serial run passed all 460 tests.

## Playwright failures

Four failures came from the existing Member 1 reservation tests in
`e2e/storefront/member1-reservation.spec.ts`. Their `/api/auth/me` mock returns
the customer directly as `data`, while the storefront `AuthContext` expects
`data.customer` or `data.user`. The page therefore treats the synthetic user as
unauthenticated and keeps the booking button disabled. The relevant
authorization fixture was not changed as part of Student 3's work.

The fifth failure was the navigation footer becoming detached while scrolling
during the four-worker run. The same test passed when rerun alone. The failed
run did not pass overall, and no CI quality gate was relaxed.

## Evidence

- [`e2e-full.txt`](./e2e-full.txt) - complete local Playwright run output
- [`e2e-footer-isolated.txt`](./e2e-footer-isolated.txt) - isolated footer rerun
- [`security-e2e.txt`](./security-e2e.txt) - the three passing security browser regressions
- [`recovery-evidence/e2e-db-migrate.txt`](./recovery-evidence/e2e-db-migrate.txt)
  and [`e2e-db-seed.txt`](./recovery-evidence/e2e-db-seed.txt) - isolated E2E
  database setup; seed credentials are omitted
- [`security/`](./security/) - baseline and final npm audit JSON evidence
