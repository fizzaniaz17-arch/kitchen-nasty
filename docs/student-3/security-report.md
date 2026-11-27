# Student 3 Security Report

## Scope and method

Security checks were limited to the local KitchenAsty test environment and
source-level verification of the reservation module. No public production
system was tested. Authentication, staff authorization, customer ownership,
dependency advisories, and a passive-only ZAP scan are in scope.

## Reservation access controls

The actual reservation access matrix is in
`security/student-3/access-matrix.md`. Four automated access-decision tests
are in `security/student-3/authorization-tests/reservation-access.test.ts`:
unauthenticated list denial, staff list access, cross-customer object access
denial, and customer update/delete denial.

Execution result: **4 tests passed**.

## Reservation ownership / IDOR investigation

The current checkout is version `0.3.2`, commit
`d6af7237e9569ebeab19ccab375362f9d144e25e`. The inspected
`GET /api/reservations/:id` handler fetches the record, then permits access if
the principal is staff or the reservation's `customerId` matches the customer
token ID; otherwise it returns `403` before returning reservation data.

The existing regression suite contains 12 tests, including cross-customer
denial and PII non-disclosure; all 12 passed. Student 3's additional access
suite also passed. The checked-in regression test comment attributes an
earlier report to a private 2026-07-28 disclosure and states that the
cross-customer read occurred on versions `<=0.3.0`. The publicly accessible
GitHub security-advisories API returned `404`; no public advisory identifier
or affected-version range was independently verified. Therefore the report
does not claim to have verified a public advisory or disclosure details.

## Dependency audit

`npm audit` was executed after dependency installation and saved as
`reports/student-3/security/npm-audit.json`.

| Severity | Count |
|---|---:|
| Critical | 5 |
| High | 47 |
| Moderate | 30 |
| Low | 7 |
| Total | 89 |

No automatic audit fix was run. The report is workspace-wide and includes
development, docs, and mobile dependency trees, so counts are not specific to
the reservation runtime. Review affected paths and breaking-change risk
before upgrading.

## OWASP ZAP

OWASP ZAP 2.17.0 ran in Docker in **passive-only** mode against the local API,
admin Vite server, and storefront Vite server while the customer reservation,
staff confirmation, and keyboard-navigation workflows ran through the proxy.
The connected and keyboard workflows passed **2/2**; the passive queue was
empty when results were captured. No active scan was run.

The sanitized, reproducible summary is
`reports/student-3/security/zap-passive.json`; regenerate it with
`node security/student-3/zap-summary.cjs` while the local ZAP API is running.
It omits query values and request/response evidence. ZAP recorded 169 alert
instances across eight alert types. The counts include repeated instances
for individual Vite development modules.

| ZAP alert | Risk | Instances | Triage |
|---|---|---:|---|
| Content Security Policy (CSP) Header Not Set | Medium | 3 | Header absent on scanned UI pages. Both production Nginx configs also lack security-header directives; verify/fix at the serving layer. |
| Missing Anti-clickjacking Header | Medium | 3 | Header absent on scanned UI pages. Add `X-Frame-Options` or CSP `frame-ancestors` after confirming framing is not required. |
| X-Content-Type-Options Header Missing | Low | 127 | Repeated across Vite development source/dependency modules; production Nginx configs also do not set `nosniff`. |
| Information Disclosure - Suspicious Comments | Informational | 27 | Returned from Vite development source/dependency modules; not evidence that production bundles expose these comments. |
| Information Disclosure - Sensitive Information in URL | Informational | 2 | The observed 12-character `token` query parameter was on each Vite UI root. Vite's development client constructs its HMR WebSocket URL with `?token=...`; this is a development-server handshake value, not an application login JWT. The value was not copied into the report. |
| Authentication Request Identified | Informational | 2 | Expected customer and staff login traffic. |
| Session Management Response Identified | Informational | 2 | Expected login responses; the application uses bearer JWTs. |
| Modern Web Application | Informational | 3 | Informational technology-detection result. |

No High or Critical alerts were recorded. The scan is not a production
assessment: it observed Vite development servers. Configuration review found
that the admin and storefront Nginx configs also omit CSP, anti-framing, and
`nosniff` headers, so the UI header findings should not be dismissed as
development-only. Verify them against a production-like deployment and add
appropriate headers there.

### Additional source-level session finding

The social-auth callback redirects with a signed customer JWT in the URL
query (`packages/server/src/controllers/social-auth.controller.ts`), and the
storefront callback reads that value and stores it in `localStorage`
(`packages/storefront/src/pages/AuthCallback.tsx`). This social-auth path was
not exercised by the ZAP workflow, so it is not included in the alert counts.
Bearer tokens in URLs can enter browser history, server/proxy logs, and
referrer data. Treat this as a separate security issue and evaluate replacing
the URL-carried JWT with a short-lived, single-use authorization code or a
secure cookie-based exchange. The normal customer/staff flows also store
bearer tokens in `localStorage`, which increases impact if script injection
occurs; cookie migration would require a broader design and CSRF review.

## Limitations

- Authorization integration tests use mocked persistence; they verify server
  route decisions but are not a live PostgreSQL ownership test.
- ZAP was passive-only and targeted local development servers; it did not test
  production, social login, or actively probe for vulnerabilities.
- No production-like HTTP security-header or cookie behavior has been
  confirmed. Authentication is bearer-token based rather than cookie based.
- No dependency was changed to address npm audit findings.
- The repository's earlier test comment describes a private IDOR disclosure,
  but the GitHub advisory lookup did not verify a public advisory identifier.
