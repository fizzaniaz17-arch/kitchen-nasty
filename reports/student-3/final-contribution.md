# Student 3 Final Contribution Report

## Role and scope

Student 3 focused on software quality evaluation, browser automation, security investigation, dependency review, recovery testing, and quality documentation for the KitchenAsty project.

The work was intended to evaluate the existing application and document findings without claiming that unperformed tests had passed.

## Contributions

### 1. Browser automation and functional testing

Recovered the local Docker engine and prepared a dedicated `student3_e2e`
database inside the isolated `student3-recovery-pg` PostgreSQL container.
Applied all seven migrations and seeded synthetic data without using the
shared `kitchenasty-db` service or volume.

The final single-worker Playwright run executed all 142 tests against that
database: 138 passed and four existing Member 1 reservation tests failed
after timing out on clicks of a disabled `Book Table` button. All admin tests
and all other storefront tests passed. The
four reservation tests and Member 1 functionality were not modified. The
focused navigation rerun passed 6/6, including the Elegant mobile menu's
keyboard/state behavior; the separate targeted security/navigation run passed
9/9. Logs are retained under `evidence/tests/`.

### 2. Security evaluation

Reviewed dependency audit findings and documented remediation decisions. Evaluated security headers and social-authentication token handling.

The 2026-11-26 npm audit reported 23 findings in the full dependency tree
(0 critical, 1 high, 22 moderate), 21 in the combined production dependency
tree (0 critical, 1 high, 20 moderate), and zero in the server production
workspace. The high `image-size` finding is a conditional Metro development
and build-time denial-of-service risk. The audit's Expo 58 and i18next 27
fixes are semver-major updates; no dependency upgrades were made.

Nine targeted security/navigation Playwright browser tests passed.

### 3. Database recovery

Performed recovery testing using an isolated PostgreSQL 16 container and synthetic records. Tested migration deployment, database interruption, reconnection, backup, restore, and foreign-key integrity.

The original reservation and its relations remained available after recovery and restore. The shared project database was not used or modified.

Detailed results are in `recovery.md`.

### 4. Test execution and build validation

Shared tests passed 17/17, server unit tests 60/60, server integration tests
344/344, and storefront Vitest coverage tests 5/5. The full server coverage
run passed 463 tests across 29 files and generated the configured Sonar LCOV
input. The storefront production build passed after the header accessibility
updates. Shared/server/admin/storefront builds, mobile TypeScript checking,
and Android/iOS Expo bundle exports passed. The admin build emitted a 904 kB
minified JavaScript chunk warning. Fresh and historical logs are under
`evidence/tests/`.

### 5. Documentation and evidence

Prepared test plans, use-case documentation, repository analysis, security findings, recovery results, and final contribution records. Supporting logs, audit JSON files, screenshots, and recovery evidence are retained under `reports/student-3` and `docs/sqe/student-3`.

## Outstanding items

- Four existing Member 1 reservation E2E cases remain failing. They were not
  changed because they belong to another member's scope; report the failures
  rather than claiming the entire suite is green.
- Sonar server analysis was not run because no local scanner or Sonar token
  was available. Both configured LCOV inputs are generated; check the
  branch's CI/Sonar result after pushing.
- The configured `npm run lint` command could not start because ESLint is not
  installed or available on PATH.
- The npm audit reports 23 full-tree findings and 21 combined production
  findings. Proposed Expo 58 and i18next 27 fixes are semver-major; npm 10's
  audit-fix dry run failed internally, so no dependency changes were made.
- Review the four medium CSP alerts against a production resource inventory
  and deployment CSP. ZAP scanned Vite development mode, not the Nginx build.
- ESLint was not yet rerun during this final verification.

## Conclusion

The contribution provides measured accessibility and performance results,
passive local security evidence, dependency analysis, isolated PostgreSQL
recovery results, and a completed database-backed Playwright run. It is not
fully green for final submission: four existing Member 1 reservation E2E tests
still fail, and Sonar analysis must be checked in the configured CI/Sonar
environment. The CSP policy and remaining dependency advisories are
documented for review.
