# Student 3 Accessibility Evaluation

## Objective

Evaluate the usability and accessibility of the existing application, with particular attention to keyboard navigation, semantic controls, labels, focus behavior, and screen-reader-friendly structure.

## Screen and method

The test screen was the mobile storefront home page at `http://127.0.0.1:5174/`
using a 375 x 812 viewport. Audits used Lighthouse 13.6.0 and axe-core 4.14.1.
Keyboard-only testing used Tab and Enter in a real headless Chromium session.

## Before and after results

| Check | Before | After |
|---|---:|---:|
| Lighthouse accessibility score | 98/100 | 100/100 |
| axe-core violations | 1 moderate | 0 |
| axe-core passes | 31 | 31 |
| Heading hierarchy | Feature headings skipped a level below the page `h1` | Classic feature headings use `h2`; themed feature headings remain nested under their section `h2` |
| Mobile menu state | No `aria-expanded` or `aria-controls` | State and control relationship exposed in Classic and all nine themed headers |
| Hero subtitle contrast | 3.885:1 at the light gradient endpoint, below 4.5:1 | Changed to white text |
| Keyboard navigation | Menu opened, but state was not announced | Tab sequence and Enter operation verified |

## Genuine issues fixed

1. The feature-card headings were changed from `h3` to `h2`, preserving the
   classic page hierarchy below the existing `h1`. In themed layouts, card
   headings are `h3` children of their section `h2`, which is a valid hierarchy.
2. The hero subtitle was changed from `text-primary-100` to white text.
3. The mobile menu button now exposes `aria-expanded={mobileOpen}` and
   `aria-controls="storefront-mobile-nav"` in the classic header and all nine
   selectable themed headers. Each mobile menu has the matching controlled ID.

The post-fix axe run still reports three gradient text elements as incomplete
for automated contrast calculation. The browser-computed gradient endpoints and
foreground colors were measured directly: the white h1 passes 4.94:1 minimum,
white hero subtitle passes 4.94:1 minimum at the light endpoint, and the white
bordered CTA passes 4.94:1 minimum.

## Executed browser verification

- Lighthouse before report: `evidence/accessibility/lighthouse-before.report.{html,json}`
- Lighthouse after report: `evidence/accessibility/lighthouse-after.report.{html,json}`
- axe before report: `evidence/accessibility/axe-before.json`
- axe after report: `evidence/accessibility/axe-after.json`
- Before/after screenshots: `evidence/accessibility/before-home.png`,
  `after-home.png`, `before-mobile-menu-open.png`, and
  `after-mobile-menu-open.png`
- Contrast evidence: `evidence/accessibility/contrast-before.json` and
  `contrast-after.json`. The post-fix measurements were captured in headless
  Chromium at 375 x 812; the subtitle is white and its minimum endpoint
  contrast is 4.94:1.
- Keyboard evidence: `evidence/accessibility/keyboard-before.json` and
  `keyboard-after.json`. A fresh post-fix run reached the mobile-menu toggle
  with Tab, opened it with Enter, verified `aria-expanded="true"`, and moved
  focus to the Home link.
- Final Playwright navigation rerun: 6/6 passed, including the heading
  hierarchy and keyboard mobile-menu regression tests on the seeded Elegant
  header. The hierarchy assertion checks for one `h1` and no skipped heading
  levels rather than requiring sibling section titles to have the same level.
  Output: `evidence/tests/playwright-navigation-rerun.txt`.
- The full database-backed Playwright suite also passed the mobile-menu test
  as part of 138 passing tests; the four failures were in the separate
  Member 1 reservation suite.

## Conclusion

The selected storefront screen improved from a Lighthouse 98/100 score to
100/100 and from one axe violation to zero. The remaining axe gradient contrast
checks are incomplete, not violations, and their actual endpoint contrast was
recorded rather than inferred.
