# Student 3 — Test Plan (Complete)

## 1. Test Scope

### In Scope

- **Customer Reservation Workflow (UC-S3-01):** End-to-end booking from the
  storefront reservation page, including location/date/party-size selection,
  availability checking, form submission, and confirmation.
- **Admin Reservation Management (UC-S3-02):** Staff reservation list browsing,
  filtering, detail viewing, status updates, and table assignment through the
  admin application.
- **Usability and Accessibility:** Keyboard navigation, axe-core automated
  scanning, Lighthouse auditing, and accessibility remediation verification.
- **Defensive Security:** Authorization testing, IDOR verification, ZAP passive
  scanning, security controls review, and dependency auditing.
- **Performance:** k6 load testing of the availability API endpoint under
  baseline and concurrent workloads.

### Out of Scope

- Payment flows and Stripe/PayPal integration.
- Mobile application testing (React Native).
- Production deployment testing.
- Active security scanning or penetration testing.
- Recovery testing (assigned to Student 2).
- Other modules (orders, menu, reviews, coupons, loyalty).

---

## 2. Risk-Based Testing Approach

Testing priorities are based on the following risk assessment:

| Risk Area | Likelihood | Impact | Priority | Approach |
|---|---|---|---|---|
| Authorization bypass | Medium | High | P1 | Automated API-level access decision tests + IDOR regression |
| Data leakage (customer PII) | Medium | High | P1 | Ownership check verification; 403 response without data |
| Accessibility violations | High | Medium | P2 | axe-core + Lighthouse automated scanning; fix and retest |
| Functional regression | Low | Medium | P2 | End-to-end Playwright workflows with postcondition checks |
| Performance degradation | Low | Medium | P3 | k6 baseline + concurrent workloads with predefined thresholds |
| Security header gaps | High | Low | P3 | ZAP passive scan; source/config review |

---

## 3. Roles

| Role | Responsibility | Person |
|---|---|---|
| Test designer | Use case specification, test plan | Student 3 |
| Test implementer | Playwright, k6, axe-core, Lighthouse automation | Student 3 |
| Test executor | Running all Student 3 test suites | Student 3 |
| Security reviewer | ZAP operation, dependency audit, controls review | Student 3 |
| Recovery coordinator | PostgreSQL recovery testing | Student 2 (primary), Student 3 (review) |

---

## 4. Environment

| Component | Version / Detail |
|---|---|
| Node.js | v22.23.0 |
| npm | 10.9.8 |
| Docker | 29.8.2 (Docker Desktop) |
| PostgreSQL | 16 (Docker Compose) |
| Playwright | 1.58.2 |
| axe-core | 4.14.0 (@axe-core/playwright) |
| Lighthouse | 13.6.0 |
| k6 | Grafana k6 OSS (Docker) |
| OWASP ZAP | 2.17.0 (Docker) |
| Browser | Chromium (Playwright bundled) |

---

## 5. Test Data

- **Seeded accounts:** `customer@example.com` / `customer123` (customer);
  `admin@kitchenasty.com` / `admin123` (staff).
- **Seeded location:** 1 downtown location with 10 tables (Table 1–10).
- **Synthetic reservation data:** Created during tests with unique comment identifiers;
  cleaned up in `finally` blocks.
- **No production data or credentials** are used or stored in reports.

---

## 6. Schedule

| Week | Activities |
|---:|---|
| 1 | Repository analysis, environment setup, initial test plan |
| 2 | Use case specifications, initial Playwright automation |
| 3 | Accessibility scanning, security tests, additional flow automation |
| 4 | Performance testing (k6), evidence collection |
| 5 | Documentation consolidation, final verification, reporting |

---

## 7. Entry Criteria

| Criterion | Required Before Testing |
|---|---|
| Local environment operational | Docker, PostgreSQL, all 3 dev servers start successfully |
| Database seeded | At least 1 location, 1 customer, 1 staff account, 10 tables |
| Existing tests pass | Vitest unit/integration suites and existing Playwright specs pass |
| Test tools available | Playwright, axe-core, Lighthouse, k6 installed/accessible |

---

## 8. Exit Criteria

| Criterion | Required for Completion |
|---|---|
| Use case coverage | Both UC-S3-01 and UC-S3-02 MSF + alt + exception flows automated |
| Accessibility | Zero serious/critical axe violations after remediation |
| Authorization | At least 4 access decisions verified (1+ allowed, 1+ denied) |
| Performance | All 4 k6 workloads pass predefined thresholds |
| Security scan | ZAP passive scan completed with findings documented |
| Documentation | All reports created with actual evidence references |

---

## 9. Suspension Criteria

Testing should be suspended if:

1. The local PostgreSQL database becomes unavailable and cannot be restarted.
2. The API server crashes on startup due to configuration issues (e.g., invalid JWT secret).
3. A critical defect in the reservation module prevents any booking from completing.
4. A dependency update breaks the application build.

---

## 10. Resumption Criteria

Testing may resume when:

1. The suspended condition is resolved and documented.
2. The environment has been verified (health check, seed data, dev servers).
3. No previously passing tests have regressed.
4. The team has been notified of any changes that affect shared components.

---

## 11. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Docker Desktop unavailable | Medium | High | Document startup procedure; use alternative PostgreSQL |
| Rate limiter interference with k6 | High | Medium | Use pacing intervals; restart API between runs |
| Seeded data pollution | Medium | Medium | Use unique comment identifiers; cleanup in finally blocks |
| Vite development server instability | Low | Medium | Use `reuseExistingServer: true` in Playwright config |
| Team member modifies shared component | Low | High | Test on isolated branch; don't merge others' branches |

---

## 12. Three-Point Effort Estimates

Retrospective planning estimates in **person-hours**. O = Optimistic, M = Most Likely,
P = Pessimistic. PERT expected = `(O + 4M + P) / 6`.

| Work Package | O | M | P | PERT |
|---|---:|---:|---:|---:|
| Use-case analysis and traceability | 2 | 3 | 5 | 3.2 |
| Playwright workflow and flow coverage | 4 | 7 | 12 | 7.3 |
| Accessibility audits and remediation | 2 | 4 | 7 | 4.2 |
| Authorization, dependency, and security testing | 3 | 6 | 12 | 6.5 |
| k6 performance testing and analysis | 2 | 3 | 6 | 3.3 |
| Evidence review and reporting | 2 | 4 | 8 | 4.3 |
| **Total** | **15** | **27** | **50** | **28.8** |

### Actual vs. Estimated Comparison

| Work Package | PERT Estimate (hrs) | Actual Effort | Variance |
|---|---:|---|---|
| Use-case analysis and traceability | 3.2 | ~3 hours | Within estimate |
| Playwright workflow and flow coverage | 7.3 | ~8 hours | Slightly over (additional flow tests) |
| Accessibility audits and remediation | 4.2 | ~4 hours | Within estimate |
| Authorization, dependency, and security | 6.5 | ~6 hours | Within estimate |
| k6 performance testing | 3.3 | ~3 hours | Within estimate |
| Evidence review and reporting | 4.3 | ~5 hours | Slightly over (more documentation) |
| **Total** | **28.8** | **~29 hours** | **~0.7% over** |

**Note:** Actual effort figures are approximate planning estimates, not measured
time-sheet values. The project did not use time-tracking tools, so these figures
are retrospective assessments of time spent. The close match to the PERT estimates
suggests the three-point method was reasonably calibrated for this scope.

The estimate excludes dependency remediation, production security configuration,
Student 2's recovery execution, and team coordination waiting time.

---

## 13. Test Traceability

| Area | Verification | Evidence | Status |
|---|---|---|---|
| UC-S3-01 customer booking | Connected workflow + mocked flows | `e2e/student-3/*.spec.ts` | ✅ Complete |
| UC-S3-02 staff management | Connected workflow + mocked flows | `e2e/student-3/*.spec.ts` | ✅ Complete |
| Authorization | API access decisions + IDOR regression | `security/student-3/`, integration tests | ✅ Complete |
| Accessibility | axe + Lighthouse + keyboard | `e2e/student-3/accessibility.spec.ts`, reports | ✅ Complete |
| Security | ZAP passive + controls review + dependency audit | `reports/student-3/security/` | ✅ Complete |
| Performance | k6 4× 60-second workloads | `performance/student-3/` | ✅ Complete |
| Recovery | Coordinate with Student 2 | `docs/student-3/recovery-report.md` | ⏳ Pending Student 2 |
