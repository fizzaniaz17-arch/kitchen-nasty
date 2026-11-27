# Student 3 — Software Quality Engineering Testing Contribution

## Status

Work is in progress. This report distinguishes completed evidence from
remaining requirements; it does not claim that recovery or all-flow
automation is complete.

## Completed

- Repository reconnaissance and local setup; PostgreSQL migrations, seed, and
  service checks succeeded earlier.
- Customer booking and staff reservation-management use cases, with
  alternative/exception flows and per-use-case traceability in
  `use-cases.md`.
- Connected Playwright workflow: customer creates a reservation and staff
  confirms the same record; test cleanup removes the reservation.
- Keyboard navigation smoke test and four authorization decisions.
- Customer and admin reservation accessibility fixes and audit evidence.
- Student 3 test plan with traceability and three-point effort estimates.
- Focused browser alternative/exception tests for party-size changes,
  unavailable slots, API submission failure, and admin list filtering.
- Passive-only OWASP ZAP run with a sanitized report.
- Four 60-second k6 workloads (1 VU and 5 VUs, two executions each).
- Workspace npm audit and source-level reservation access-control review.

## Verified execution results

- Existing reservation, IDOR, and table Vitest suites: **52/52 passed**.
- Existing reservation Playwright tests: **15/15 passed**.
- Student 3 connected workflow and keyboard tests: **2/2 passed**.
- Student 3 alternative/exception/filter flow tests: **3/3 passed**.
- Student 3 authorization tests: **4/4 passed**.
- Customer and admin axe scans: **zero violations after the fixes**.
- Authenticated admin list/detail Lighthouse: Accessibility **1.00**,
  Best Practices **1.00**, SEO **0.82** on each page. The customer-screen
  paired Lighthouse result was Performance **0.72/0.78**, Accessibility
  **0.88/1.00**, Best Practices **0.74/0.74**, SEO **0.82/0.82**.
- ZAP 2.17.0 passive-only: **169 alert instances** across eight finding
  types; six Medium, 127 Low, 36 Informational, and no High/Critical alerts.
  The findings and their development/production limitations are detailed in
  `security-report.md` and `reports/student-3/security/zap-passive.json`.
- k6 four 60-second runs passed: 0% request failures; p95 **58.97 ms** and
  **58.72 ms** at 1 VU, **166.06 ms** and **129.47 ms** at 5 VUs.
- npm audit: **89 findings** (5 critical, 47 high, 30 moderate, 7 low).
- Storefront package build and frontend type-checks passed.

## Remaining

- Controlled PostgreSQL recovery and data-integrity test. Recovery is led by
  Member 2; coordinate before interrupting the shared local test service.
- Verify and address the UI security-header gaps in a production-like
  deployment. Source review also found that social-auth redirects carry a
  customer JWT in a URL query; this flow was not exercised in the ZAP run.
- Dependency finding triage and public advisory verification. No public
  advisory ID was independently confirmed, and no dependency fixes were made.
- Coordinate the recovery test with Member 2 before interrupting PostgreSQL.
- Final changed-file review; no commit or push has been made.

## Environment and tooling limitations

- The local Compose PostgreSQL service remains healthy on port `5432`, as
  previously requested. Temporary API, Vite admin/storefront, and ZAP services
  were stopped after evidence capture; Docker Desktop remains available.
- The local ignored `.env` contains the database URL and a JWT secret; neither
  secret is included in reports.
- The repository declares an `npm run lint` script but lacks local ESLint
  setup/configuration. No lint dependency or configuration was added as an
  unrelated tooling change.
