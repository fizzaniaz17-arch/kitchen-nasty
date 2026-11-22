# Student 3 Accessibility Evaluation

## Objective

Evaluate the usability and accessibility of the existing application, with particular attention to keyboard navigation, semantic controls, labels, focus behavior, and screen-reader-friendly structure.

## Evidence available

The repository contains Playwright browser tests for reservation and table-management workflows. These cover user interactions such as selecting locations, dates, time slots, party sizes, and tables.

The application also contains accessibility-related labels and semantic elements in its frontend components.

## Evaluation status

A completed Lighthouse accessibility audit and a completed axe-core audit with recorded scores or violation results were not found in the Student 3 report evidence reviewed for this submission.

A verified keyboard-only navigation result and a before/after accessibility comparison are also not available in the current evidence set.

Therefore, no Lighthouse score, axe violation count, or accessibility improvement percentage is claimed.

## Recommended follow-up

1. Run Lighthouse accessibility audits on the relevant storefront and admin screens.
2. Run axe-core against the same screens.
3. Test navigation using only the keyboard.
4. Record focus order, visible focus indicators, labels, and keyboard-operable controls.
5. Fix one agreed screen and capture comparable before-and-after results.

## Conclusion

The browser automation provides functional interaction coverage, but it should not be presented as a substitute for a dedicated accessibility audit. Accessibility testing remains an outstanding evidence item.
