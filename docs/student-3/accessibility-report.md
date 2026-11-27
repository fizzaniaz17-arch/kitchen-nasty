# Student 3 Accessibility and Usability Report

## Scope and method

The customer reservation form at `http://localhost:5174/reservations` and the
authenticated admin reservation list/detail screens at
`http://localhost:5173/reservations` were tested locally using Playwright
1.58.2, axe-core 4.14.0 (`@axe-core/playwright`) and Lighthouse 13.6.0. The
customer Lighthouse comparison used its default mobile emulation. Admin
Lighthouse audits used desktop emulation and checked Accessibility, Best
Practices, and SEO.

The existing page used visual `<label>` elements without `htmlFor`/matching
control IDs. A genuine label association fix was applied to the location,
date, party-size, and comment fields. Time-slot buttons retain native button
semantics; their label is presented as ordinary text rather than a label
element.

## Findings and remediation

| Finding | Impact | Fix / status |
|---|---|---|
| Reservation form fields had no programmatic label association | Screen-reader users could not reliably identify the location, date, party-size, and comment controls | Added `htmlFor` and stable matching input IDs. Verified with Playwright accessible-name assertions. |
| Lighthouse color-contrast audit reports a failure | Some storefront text may not meet the contrast threshold | Not changed in this pass because the affected node/color pair requires further component-level inspection; see the report limitations. |
| Lighthouse console-error audit reports a failure | Page load logged browser-console errors | Requires inspection of Lighthouse details and browser console context; not assumed to be a reservation submission defect. |

## Comparable Lighthouse scores

Two Lighthouse 13.6.0 runs were performed against the same customer
reservation route, with the same Chromium/mobile-emulation defaults and local
Vite-only environment. The database/API was unavailable during both runs, so
these scores are a controlled comparison of the form screen, not a full-stack
performance result.

| Category | Before | After |
|---|---:|---:|
| Performance | 0.72 | 0.78 |
| Accessibility | 0.88 | 1.00 |
| Best Practices | 0.74 | 0.74 |
| SEO | 0.82 | 0.82 |

The accessibility score increased from 0.88 to 1.00 alongside the label fix.
The performance difference is not attributed to the label change; Lighthouse
scores can vary between runs. Full JSON evidence is saved in
`reports/student-3/lighthouse/reservation-before.json` and
`reservation-after.json`.

An earlier audit was run while the complete local stack was available and is
kept separately as `reservation-audit.*`; its values are not compared with
the Vite-only pair. Audit details include issues such as color contrast,
console errors, main-thread work, missing meta description, invalid
`robots.txt`, and network dependency-tree opportunities. Not all Lighthouse
failures are accessibility defects.

## Authenticated admin reservation screens

Playwright logged in with the local seeded staff account and audited both the
reservation list and a seeded reservation detail page. The original axe
captures found:

- List: one minor invalid navigation-landmark role, two serious color-contrast
  nodes (`Unassigned` and the `Details` link), and one serious
  label/content-name mismatch in the user-menu button.
- Detail: one minor invalid navigation-landmark role and one serious
  label/content-name mismatch in the user-menu button.

The admin fixes moved the navigation landmark onto the nested `<nav>`,
increased contrast for the two affected list values, and made the user-menu
button name derive from its visible account text plus screen-reader-only
context. The pending-orders badge also used a nonexistent `/api/dashboard`
route; it now reads the total from the existing staff-filtered pending-orders
endpoint. Playwright verifies that request succeeds.

After remediation, full axe scans of both authenticated screens reported zero
violations. The two admin accessibility tests passed. Lighthouse scores for
both the list and detail screens were Accessibility **1.00**, Best Practices
**1.00**, and SEO **0.82**. The first admin Lighthouse run found a missing
button name and a 404 from `/api/dashboard`; both were resolved. The remaining
SEO failures are a missing meta description and the Vite development server
serving the app shell as `robots.txt` (17 parse errors). These are recorded as
development/private-admin limitations, not as fixed product behavior.
Full reports are saved as `reports/student-3/lighthouse/admin-reservation-list.json`
and `admin-reservation-detail.json`; the authenticated audit runner is
`performance/student-3/admin-lighthouse.cjs`.

## axe-core and keyboard checks

- The original source markup produced critical axe `label` and `select-name`
  violations, affecting two nodes each.
- The fixed page produced no axe violations in the same scan configuration.
- Before/after axe JSON evidence is saved in
  `reports/student-3/accessibility/reservation-before.json` and
  `reservation-after.json`.
- Playwright verified that each of the four form controls exposes a non-empty
  accessible name.
- A keyboard smoke test verified that Tab can move focus to visible controls.
- This is not a complete WCAG conformance evaluation. Shift+Tab, activation,
  full focus order, and axe findings by severity remain to be documented.

## Evidence and limitations

- Lighthouse JSON/HTML: `reports/student-3/lighthouse/reservation-audit.*`
- axe-core results: `reports/student-3/accessibility/`
- Playwright artifacts: `test-results/` (ignored by Git)
- Customer tests: `e2e/student-3/accessibility.spec.ts`
- Admin tests: `e2e/student-3/admin-accessibility.spec.ts`

The customer before audit used the original form markup, temporarily restored
only to capture a baseline; the source fix was then reapplied before the after
run. The accessibility score improved from 0.88 to 1.00. Admin audits used a
local authenticated staff account and synthetic seeded reservation data. The
audit environment was the local Vite development server; Lighthouse scores are
environment-sensitive and the admin SEO result is not representative of a
production static deployment.
