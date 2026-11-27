# Student 3 — GQM Metrics

## Goal-Question-Metric Framework

### Goal

Assess the quality of the KitchenAsty Reservations and Table Management module
from the perspective of a quality engineer, with respect to functional correctness,
security, accessibility, and performance, in the context of a university SQE project.

---

## Metric 1 — Defect Density

### Question
How many defects were found per unit of tested functionality?

### Definition
Defect density = Number of defects found ÷ Number of test areas assessed

### Data Source
Defects identified during Student 3 testing activities across all assessment areas.

### Calculation

| Test Area | Defects Found | Description |
|---|---:|---|
| Use case functional (UC-S3-01) | 0 | Customer booking workflow works as specified |
| Use case functional (UC-S3-02) | 1 | No transition state validation on status updates (design observation) |
| Accessibility — Customer | 1 | Missing label association (fixed) |
| Accessibility — Admin List | 3 | Landmark, contrast ×2, label-name (all fixed) |
| Accessibility — Admin Detail | 2 | Landmark, label-name (all fixed) |
| Security — Authorization | 0 | All access decisions correct |
| Security — ZAP | 2 | Missing CSP and anti-clickjacking headers (open) |
| Security — Source review | 1 | Social auth token-in-URL (open) |
| Performance | 0 | All workloads passed thresholds |
| Dependency audit | 89 | npm audit findings (workspace-wide, mostly build deps) |

**Total defects found (excluding npm audit):** 10

**Test areas assessed:** 9

**Defect density:** 10 ÷ 9 = **1.11 defects per test area**

### Interpretation

The defect density of approximately 1 defect per test area is moderate. Most defects
were accessibility issues that were immediately remediated. The functional reservation
workflow operates correctly. The highest-risk open findings are in security headers and
the social-auth token handling, which are infrastructure-level issues outside the
reservation module.

**Limitation:** The npm audit count (89) is excluded from the defect density because
it represents workspace-wide dependency advisories, not defects in the reservation module code.

---

## Metric 2 — Requirements Coverage

### Question
What percentage of Student 3 assigned requirements have been tested?

### Definition
Requirements coverage = (Requirements with test evidence ÷ Total assigned requirements) × 100%

### Data Source
Student 3 assignment requirements mapped to test evidence.

### Calculation

| Requirement | Has Test Evidence | Evidence |
|---|---|---|
| Use case specification | ✅ Yes | `reports/student-3/use-cases.md` |
| Use case test automation | ✅ Yes | 6 Playwright spec files, 10+ tests |
| Usability assessment | ✅ Yes | Keyboard test, workflow tests |
| Accessibility evaluation | ✅ Yes | axe-core + Lighthouse scans |
| Defensive security assessment | ✅ Yes | Access matrix, ZAP, controls review |
| Dependency audit | ✅ Yes | npm audit JSON + report |
| Performance testing (k6) | ✅ Yes | 4 workload runs with summaries |
| Test plan and estimation | ✅ Yes | Test plan + PERT estimates |
| Monitoring | ✅ Yes | Weekly progress, GQM metrics |
| Test completion report | ✅ Yes | Final report with evidence |

**Coverage:** 10 ÷ 10 = **100%**

### Interpretation

All 10 assigned requirements have associated test evidence or documentation. However,
"coverage" means test evidence exists, not that every sub-requirement within each area
is exhaustively verified. The deepest gaps are:
- Recovery testing is documented but not executed (Student 2 responsibility).
- ZAP ran passive-only against development servers, not production.
- k6 tested one endpoint with conservative pacing due to rate limiting.

---

## Metric 3 — Defect Reopen Rate

### Question
What percentage of fixed defects were reopened after the initial fix?

### Definition
Defect reopen rate = (Defects reopened ÷ Defects fixed) × 100%

### Data Source
Fixed defects tracked during the accessibility remediation cycle.

### Calculation

| Defect | Fixed | Reopened | Notes |
|---|---|---|---|
| Customer form label association | ✅ Fixed | ❌ Not reopened | Before/after axe scans confirm fix |
| Admin navigation landmark | ✅ Fixed | ❌ Not reopened | Post-fix axe scan: 0 violations |
| Admin list contrast | ✅ Fixed | ❌ Not reopened | Post-fix axe scan: 0 violations |
| Admin label-name mismatch | ✅ Fixed | ❌ Not reopened | Post-fix axe scan: 0 violations |
| Admin badge 404 endpoint | ✅ Fixed | ❌ Not reopened | Playwright verifies successful request |

**Defects fixed:** 5
**Defects reopened:** 0

**Reopen rate:** 0 ÷ 5 = **0%**

### Interpretation

No fixed defects were reopened. This indicates that the accessibility fixes were
correctly implemented and verified with post-fix automated scans. The low reopen
rate is partly due to the fix-verify cycle being completed within the same testing
session rather than across multiple development iterations.

**Limitation:** The sample size is small (5 fixes). In a larger project with longer
development cycles, the reopen rate would be a more meaningful indicator of fix quality.

---

## Summary

| Metric | Value | Interpretation |
|---|---|---|
| Defect Density | 1.11 per area | Moderate; most defects were accessibility issues |
| Requirements Coverage | 100% | All requirements have evidence; depth varies |
| Defect Reopen Rate | 0% | All fixes verified; small sample size |
