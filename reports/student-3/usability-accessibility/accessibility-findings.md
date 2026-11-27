# Student 3 — Consolidated Accessibility Findings

## Assessment Scope

The following screens were assessed for accessibility and usability:

1. **Customer Reservation Form** — `http://localhost:5174/reservations`
2. **Admin Reservation List** — `http://localhost:5173/reservations`
3. **Admin Reservation Detail** — `http://localhost:5173/reservations/:id`

Tools used:
- **axe-core** 4.14.0 via `@axe-core/playwright`
- **Lighthouse** 13.6.0 (Accessibility, Best Practices, SEO categories)
- **Playwright** 1.58.2 for automated browser testing and keyboard navigation

## Consolidated Findings

Findings from both Lighthouse and axe-core are merged below. Where both tools report the same issue, it is counted once.

### Finding 1 — Missing Programmatic Label Association (Customer Form)

| Field | Detail |
|---|---|
| Affected Elements | `<select>` (location), `<input type="date">` (date), `<select>` (party size), `<textarea>` (comment) |
| Violation Description | Form controls had visual `<label>` elements but no `htmlFor` attribute matching the control's `id`. Screen readers could not programmatically associate the label with the control. |
| Severity / Impact | **Critical** (axe-core); **Serious** impact on assistive technology users |
| WCAG Criterion | WCAG 2.1 SC 1.3.1 Info and Relationships (Level A), SC 4.1.2 Name, Role, Value (Level A) |
| User Impact | Screen reader users cannot reliably identify which label corresponds to which form control, making the booking form unusable without sighted assistance |
| Source | axe-core `label` and `select-name` rules |
| Status | **FIXED** — `htmlFor` attributes and stable matching `id` attributes added to all four controls |

### Finding 2 — Color Contrast Failure (Storefront)

| Field | Detail |
|---|---|
| Affected Elements | Storefront text elements (specific nodes identified by Lighthouse) |
| Violation Description | Text color does not meet the 4.5:1 contrast ratio against its background |
| Severity / Impact | **Moderate** (Lighthouse); affects users with low vision |
| WCAG Criterion | WCAG 2.1 SC 1.4.3 Contrast (Minimum) (Level AA) |
| User Impact | Users with low vision or color deficiency may have difficulty reading the affected text |
| Source | Lighthouse color-contrast audit |
| Status | **NOT FIXED** — Requires component-level color theme investigation beyond the reservation module scope |
| Residual Risk | Low. The affected text is in the storefront template, not the reservation form controls. |

### Finding 3 — Console Error During Page Load (Storefront)

| Field | Detail |
|---|---|
| Affected Elements | Browser console |
| Violation Description | Lighthouse detected JavaScript errors logged during page load |
| Severity / Impact | **Low** (Lighthouse); may indicate missing API responses or configuration issues |
| WCAG Criterion | Not directly WCAG-related; affects Best Practices score |
| User Impact | May cause degraded functionality if errors prevent form initialization |
| Source | Lighthouse console-error audit |
| Status | **NOT FIXED** — Requires investigation of Lighthouse console context; not confirmed as a reservation form defect |

### Finding 4 — Invalid Navigation Landmark Role (Admin)

| Field | Detail |
|---|---|
| Affected Elements | Admin layout navigation container |
| Violation Description | A `<div>` with `role="navigation"` contained a nested `<nav>`, causing an invalid landmark hierarchy |
| Severity / Impact | **Minor** (axe-core); may confuse screen reader landmark navigation |
| WCAG Criterion | WCAG 2.1 SC 1.3.1 Info and Relationships (Level A) |
| User Impact | Screen reader users may encounter confusing landmark navigation structure |
| Source | axe-core `landmark-unique` rule |
| Status | **FIXED** — Navigation role moved to the nested `<nav>` element |

### Finding 5 — Color Contrast in Admin Reservation List

| Field | Detail |
|---|---|
| Affected Elements | "Unassigned" text and "Details" link in admin reservation table |
| Violation Description | Text color does not meet the 4.5:1 contrast ratio |
| Severity / Impact | **Serious** (axe-core); two nodes affected |
| WCAG Criterion | WCAG 2.1 SC 1.4.3 Contrast (Minimum) (Level AA) |
| User Impact | Staff using the reservation list with low vision cannot easily read table assignment status or detail links |
| Source | axe-core `color-contrast` rule |
| Status | **FIXED** — Contrast increased for both affected values |

### Finding 6 — Label/Content Name Mismatch in User Menu Button (Admin)

| Field | Detail |
|---|---|
| Affected Elements | Admin layout user-menu button |
| Violation Description | The button's accessible name did not match its visible content |
| Severity / Impact | **Serious** (axe-core); one node affected per page |
| WCAG Criterion | WCAG 2.1 SC 2.5.3 Label in Name (Level A) |
| User Impact | Speech-input users may not be able to activate the button by speaking its visible label |
| Source | axe-core `label-content-name-match` rule |
| Status | **FIXED** — Button name now derives from visible account text with screen-reader context |

### Finding 7 — Pending Orders Badge Using Non-Existent API Route (Admin)

| Field | Detail |
|---|---|
| Affected Elements | Admin sidebar pending-orders badge |
| Violation Description | The badge queried a non-existent `/api/dashboard` route, causing a 404 error |
| Severity / Impact | **Medium** functional issue; not a WCAG violation but affects reliability |
| User Impact | Staff see a 404 error in the network tab; badge may show incorrect count |
| Source | Lighthouse, Playwright test observation |
| Status | **FIXED** — Badge now reads from the existing staff-filtered pending-orders endpoint |

### Finding 8 — Missing Meta Description and robots.txt Issues (Admin, SEO)

| Field | Detail |
|---|---|
| Affected Elements | Admin `<head>`, Vite development server robots.txt |
| Violation Description | Missing `<meta name="description">` and malformed robots.txt (Vite serves the app shell) |
| Severity / Impact | **Low** (Lighthouse SEO audit); 17 robots.txt parse errors |
| WCAG Criterion | Not WCAG-related; SEO concern |
| User Impact | None for accessibility; affects search engine discoverability |
| Source | Lighthouse SEO audit |
| Status | **NOT FIXED** — Documented as development/private-admin limitation |
| Residual Risk | None for accessibility. The admin app is a private internal tool. |

## Summary Table

| # | Finding | Severity | WCAG | Fixed? |
|---:|---|---|---|---|
| 1 | Missing label association (customer form) | Critical | 1.3.1, 4.1.2 | ✅ Yes |
| 2 | Color contrast (storefront template) | Moderate | 1.4.3 | ❌ No |
| 3 | Console error on load | Low | N/A | ❌ No |
| 4 | Invalid navigation landmark (admin) | Minor | 1.3.1 | ✅ Yes |
| 5 | Color contrast in admin list | Serious | 1.4.3 | ✅ Yes |
| 6 | Label/content name mismatch (admin menu) | Serious | 2.5.3 | ✅ Yes |
| 7 | Pending orders badge 404 | Medium | N/A | ✅ Yes |
| 8 | Missing meta description / robots.txt | Low | N/A | ❌ No |

**Fixed:** 5 findings | **Not fixed:** 3 findings (documented with justification)

## Automated Test Evidence

| Test File | Tests | Status |
|---|---|---|
| `e2e/student-3/accessibility.spec.ts` | 3 (axe scan after, axe scan before-baseline, label assertions) | Passed |
| `e2e/student-3/admin-accessibility.spec.ts` | 2 (admin list scan, admin detail scan) | Passed |
| `e2e/student-3/reservation-workflow.spec.ts` | 1 (keyboard Tab navigation) | Passed |
| `e2e/student-3/usability-keyboard.spec.ts` | 1 (full keyboard form navigation) | Passed |
