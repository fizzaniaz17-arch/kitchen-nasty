# Student 3 Final Contribution Report

## Role and scope

Student 3 focused on software quality evaluation, browser automation, security investigation, dependency review, recovery testing, and quality documentation for the KitchenAsty project.

The work was intended to evaluate the existing application and document findings without claiming that unperformed tests had passed.

## Contributions

### 1. Browser automation and functional testing

Ran a targeted, single-worker Playwright rerun on 2026-11-26: 9/9 passed,
covering storefront navigation, heading hierarchy, keyboard menu navigation,
admin/storefront response headers, and the social-auth callback. The API
process logged a missing `DATABASE_URL`; these selected browser checks do not
validate database-backed flows. The full Playwright suite has not been rerun.
Its previous 135-pass/5-failure result is historical and not claimed as a
current-branch result.

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

On this checkout, shared tests passed 17/17, server unit tests passed 60/60,
server integration tests passed 344/344, and storefront tests passed 5/5.
The full server coverage run passed 463 tests across 29 files and generated
the configured Sonar LCOV input.
Shared/server/admin/storefront production builds passed. Mobile TypeScript
checking and Expo Android/iOS bundle exports passed. The admin build emitted a
904 kB minified JavaScript chunk warning. Fresh test/build logs are under
`evidence/tests/`. The full database-backed Playwright suite has not been
rerun because Docker and an isolated PostgreSQL service are unavailable.

### 5. Documentation and evidence

Prepared test plans, use-case documentation, repository analysis, security findings, recovery results, and final contribution records. Supporting logs, audit JSON files, screenshots, and recovery evidence are retained under `reports/student-3` and `docs/sqe/student-3`.

## Outstanding items

- The Docker Linux engine was unavailable on 2026-11-26; its API named pipe
  was missing. Disk space is no longer the blocker (9.72 GB free on `C:`).
- No local PostgreSQL executable/service was available, and ports 5432,
  55432, and 55433 were not listening. Start Docker safely and use only
  `student3-recovery-pg` before running the full Playwright suite. Do not start
  or modify `kitchenasty-db`.
- Sonar server analysis was not run because no local scanner or Sonar token
  was available. Both configured LCOV inputs are generated; check the branch's
  CI/Sonar result after pushing.
- The npm audit reports 23 full-tree findings and 21 combined production
  findings. Proposed Expo 58 and i18next 27 fixes are semver-major; npm 10's
  audit-fix dry run failed internally, so no dependency changes were made.
- Review the four medium CSP alerts against a production resource inventory
  and deployment CSP. ZAP scanned Vite development mode, not the Nginx build.
- ESLint was not yet rerun during this final verification.

## Conclusion

The contribution provides measured accessibility and performance results,
passive local security evidence, dependency analysis, isolated PostgreSQL
recovery results, and fresh unit, integration, storefront, mobile, build, and
targeted browser validation. It is not fully validated for submission until
the database-backed Playwright suite and Sonar analysis are completed. The
CSP policy and remaining dependency advisories are documented for review.
