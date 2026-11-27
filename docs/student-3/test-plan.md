# Student 3 Reservation Test Plan

## Objectives and scope

Verify the customer reservation and staff reservation-management use cases
defined in [`use-cases.md`](./use-cases.md), with evidence for functional
behavior, authorization, accessibility, security, and performance. Testing is
limited to the local KitchenAsty test environment and synthetic seeded data.
Payment flows and production systems are out of scope. Database recovery is
owned by Member 2; Student 3 will coordinate and review its evidence.

## Test approach and traceability

| Area | Verification | Evidence | Current state |
|---|---|---|---|
| UC-1 customer booking | Existing storefront browser checks; connected customer-to-staff workflow; mocked alternative/exception flows | `e2e/storefront/reservations.spec.ts`, `e2e/student-3/reservation-workflow.spec.ts`, `e2e/student-3/reservation-form-flows.spec.ts` | Main success plus the party-size alternative and multiple exceptions (unauthenticated, no availability, API submission failure) are covered. |
| UC-2 staff management | Existing admin reservation checks; connected workflow confirms the created record; mocked status/date filter flow | `e2e/admin/reservations.spec.ts`, `e2e/student-3/reservation-workflow.spec.ts`, `e2e/student-3/reservation-admin-flows.spec.ts`, `security/student-3/authorization-tests/reservation-access.test.ts` | Main success plus status/date alternatives and exceptions (unauthenticated/customer denial, missing record) are covered. |
| Authorization and ownership | Targeted API access decisions and existing IDOR regression tests | `security/student-3/access-matrix.md`, `security/student-3/authorization-tests/reservation-access.test.ts` | 4 Student 3 tests and 12 IDOR regression tests passed. |
| Accessibility | Authenticated axe scans and keyboard navigation on reservation screens | `docs/student-3/accessibility-report.md`, `reports/student-3/accessibility/` | Customer and admin scans report zero violations after fixes. |
| Security | Source/config review, dependency audit, passive-only ZAP proxy capture | `docs/student-3/security-report.md`, `reports/student-3/security/` | ZAP results are documented; UI header and OAuth URL-token issues remain follow-up findings. |
| Performance | Read-only availability endpoint under constant-VU workloads | `docs/student-3/performance-report.md`, `performance/student-3/` | Four 60-second baseline/concurrent runs passed configured thresholds. |
| Recovery | Controlled local database interruption, restart, and persistence checks | `docs/student-3/recovery-report.md` | Not run; coordinate with Member 2 before stopping PostgreSQL. |

## Environment and test data

- Use the local PostgreSQL Compose service, current migrations, and seeded
  location/customer/staff records.
- Use the repository's seeded test accounts only; never put passwords,
  bearer tokens, or `.env` values in reports or screenshots.
- The connected browser test generates a unique reservation comment and
  deletes its test reservation in cleanup.
- Run k6 only against the local API. The API's global limit is 100 requests
  per 15 minutes; the script defaults to conservative pacing.
- ZAP is passive-only for this assessment. Do not start active scanning or
  direct traffic to public systems.

## Acceptance criteria

- Functional: the customer can create and review a reservation; staff can
  view and update the same record; denied access does not disclose another
  customer's reservation.
- Accessibility: tested customer and admin reservation screens have no axe
  violations after remediation; keyboard focus is usable.
- Security: authorization tests pass; all scanner findings are triaged and
  residual issues are identified. Current Medium UI-header findings and the
  source-level social-auth token-in-URL concern remain open.
- Performance: each recorded workload runs for at least 60 seconds, failure
  rate remains below 1%, and p95 response time remains below 800 ms.
- Recovery: PostgreSQL restarts successfully and the controlled test record
  remains consistent. This criterion is pending Member 2's coordinated test.
- Reporting: preserve sanitized raw summaries and explicitly identify
  environment limitations and unverified findings.

## Three-point effort estimates

These are retrospective planning estimates in **person-hours**, not measured
actuals or time sheets. They assume one Student 3 contributor familiar with
the repository, a functioning local environment, and seeded data. O =
optimistic, M = most likely, P = pessimistic. PERT expected effort is
calculated as `(O + 4M + P) / 6`. Recovery execution is excluded because
Member 2 owns that work.

| Work package | O | M | P | PERT |
|---|---:|---:|---:|---:|
| Use-case analysis and traceability | 2 | 3 | 5 | 3.2 |
| Playwright workflow and flow coverage | 4 | 7 | 12 | 7.3 |
| Accessibility audits and remediation | 2 | 4 | 7 | 4.2 |
| Authorization, dependency, and security testing | 3 | 6 | 12 | 6.5 |
| k6 performance testing and analysis | 2 | 3 | 6 | 3.3 |
| Evidence review and reporting | 2 | 4 | 8 | 4.3 |
| **Total** | **15** | **27** | **50** | **28.8** |

The estimate does not include dependency remediation, production security
configuration changes, Member 2's recovery execution, or waiting for team
coordination.
