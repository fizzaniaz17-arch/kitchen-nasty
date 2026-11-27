# Student 3 — Before-and-After Accessibility Comparison

## Overview

This document compares the accessibility state of the customer reservation form
and admin reservation screens before and after the Student 3 remediation work.

---

## Customer Reservation Form (`/reservations`)

### Lighthouse Scores

| Category | Before | After | Change |
|---|---:|---:|---|
| Performance | 0.72 | 0.78 | +0.06 (not attributed to accessibility fix; Lighthouse variance) |
| Accessibility | 0.88 | 1.00 | **+0.12** (label association fix) |
| Best Practices | 0.74 | 0.74 | No change |
| SEO | 0.82 | 0.82 | No change |

### axe-core Results

| Metric | Before | After | Change |
|---|---:|---:|---|
| Total violations | 2 (label, select-name) | 0 | **−2** |
| Critical/Serious nodes | 4 (2 per rule × 2 controls) | 0 | **−4** |
| Passes | — | All form controls pass | — |

### What Changed

**Fix applied:** Added `htmlFor` attributes to `<label>` elements and stable `id` attributes
to the location select (`reservation-location`), date input (`reservation-date`),
party size select (`reservation-party-size`), and comment textarea (`reservation-comment`)
in `packages/storefront/src/pages/Reservations.tsx`.

**How verified:**
1. Playwright test `accessibility.spec.ts` runs a full axe-core scan on the form `<main>` element and asserts zero serious/critical violations.
2. A baseline test temporarily removes the `for`/`id` attributes to capture the pre-fix state, confirming the `label` violation is present.
3. Accessible name assertions verify each control has a non-empty accessible name.

### Evidence Files

- `reports/student-3/lighthouse/reservation-before.json` — Lighthouse before fix
- `reports/student-3/lighthouse/reservation-after.json` — Lighthouse after fix
- `reports/student-3/accessibility/reservation-before.json` — axe-core before fix
- `reports/student-3/accessibility/reservation-after.json` — axe-core after fix

---

## Admin Reservation List (`/reservations`)

> **Baseline Limitation:** Pre-fix ("before") Lighthouse and axe-core JSON snapshots were **not captured** for the admin reservation list and detail screens prior to applying the accessibility fixes (verified against repository git history). Only post-fix JSON reports are retained for the admin screens; full machine-readable before-and-after comparison is available for the Customer Reservation Form above.

### Lighthouse Scores (Post-Fix Only)

| Category | Score |
|---|---:|
| Accessibility | 1.00 |
| Best Practices | 1.00 |
| SEO | 0.82 |

### axe-core Results

| Metric | Pre-Fix (Observed in DOM/Test Prior to Fix) | Post-Fix (Verified JSON) | Change |
|---|---|---|---|
| Violations | 3 (landmark, 2× contrast, label-name — no pre-fix JSON saved) | 0 | **−3** |
| Affected nodes | 4 | 0 | **−4** |

### What Changed

1. **Navigation landmark fix:** Moved `role="navigation"` from the outer `<div>` to the nested `<nav>` element in `packages/admin/src/components/AdminLayout.tsx`.
2. **Contrast fix:** Increased text contrast for the "Unassigned" table value and "Details" link in `packages/admin/src/pages/ReservationList.tsx`.
3. **User menu button fix:** Made the button's accessible name derive from its visible account text plus screen-reader-only context in the AdminLayout.
4. **Pending orders badge:** Changed the badge to use the existing staff-filtered pending-orders endpoint instead of the non-existent `/api/dashboard` route.

### Evidence Files

- `reports/student-3/accessibility/admin-reservation-list.json` — axe-core after fix
- `reports/student-3/lighthouse/admin-reservation-list.json` — Lighthouse after fix

---

## Admin Reservation Detail (`/reservations/:id`)

### Lighthouse Scores (After Fix Only)

| Category | Score |
|---|---:|
| Accessibility | 1.00 |
| Best Practices | 1.00 |
| SEO | 0.82 |

### axe-core Results

| Metric | Before | After | Change |
|---|---:|---:|---|
| Violations | 2 (landmark, label-name) | 0 | **−2** |
| Affected nodes | 2 | 0 | **−2** |

### Evidence Files

- `reports/student-3/accessibility/admin-reservation-detail.json` — axe-core after fix
- `reports/student-3/lighthouse/admin-reservation-detail.json` — Lighthouse after fix

---

## Summary

| Screen | Violations Before | Violations After | Improvement |
|---|---:|---:|---|
| Customer Reservation Form | 2 rules, 4 nodes | 0 | 100% resolved |
| Admin Reservation List | 3 rules, 4 nodes | 0 | 100% resolved |
| Admin Reservation Detail | 2 rules, 2 nodes | 0 | 100% resolved |

**Total violations eliminated:** 7 rules across 10 affected nodes → 0 violations.

The Lighthouse Accessibility score for the customer form improved from 0.88 to 1.00.
Both admin screens achieved Accessibility 1.00 and Best Practices 1.00 after the fixes.

### Remaining Unfixed Issues

| Issue | Reason | Risk |
|---|---|---|
| Storefront color contrast | Affects template-level styling outside reservation module scope | Low |
| Console error on load | Requires investigation; not confirmed as accessibility defect | Low |
| Admin SEO (meta description, robots.txt) | Development server limitation; admin is private | None |
