# Student 3 — Test Estimation

## Three-Point Estimation Method

The PERT (Program Evaluation and Review Technique) weighted average is used:

$$E = \frac{O + 4M + P}{6}$$

Where:
- **O** = Optimistic estimate (best case, no obstacles)
- **M** = Most likely estimate (normal conditions)
- **P** = Pessimistic estimate (worst case, significant obstacles)

---

## Estimates by Work Package

| Work Package | O (hrs) | M (hrs) | P (hrs) | PERT Expected (hrs) | Standard Deviation |
|---|---:|---:|---:|---:|---:|
| Use-case analysis and traceability | 2 | 3 | 5 | 3.17 | 0.50 |
| Playwright workflow and flow coverage | 4 | 7 | 12 | 7.33 | 1.33 |
| Accessibility audits and remediation | 2 | 4 | 7 | 4.17 | 0.83 |
| Authorization, dependency, and security testing | 3 | 6 | 12 | 6.50 | 1.50 |
| k6 performance testing and analysis | 2 | 3 | 6 | 3.33 | 0.67 |
| Evidence review and reporting | 2 | 4 | 8 | 4.33 | 1.00 |
| **Total** | **15** | **27** | **50** | **28.83** | — |

**Standard deviation (σ)** = (P − O) / 6

**Total project variance** = Σ(σ²) = 0.25 + 1.78 + 0.69 + 2.25 + 0.44 + 1.00 = **6.42**

**Total standard deviation** = √6.42 = **2.53 hours**

---

## Confidence Intervals

| Confidence Level | Range |
|---|---|
| 68% (±1σ) | 26.3 – 31.4 hours |
| 95% (±2σ) | 23.8 – 33.9 hours |
| 99.7% (±3σ) | 21.2 – 36.4 hours |

---

## Actual vs. Estimated Comparison

| Work Package | PERT (hrs) | Actual (hrs) | Variance | Notes |
|---|---:|---:|---|---|
| Use-case analysis | 3.17 | ~3 | −0.17 | Repository analysis was thorough; use cases written efficiently |
| Playwright automation | 7.33 | ~8 | +0.67 | Additional exception flow tests added beyond initial scope |
| Accessibility | 4.17 | ~4 | −0.17 | Fixes were straightforward label associations and contrast changes |
| Security testing | 6.50 | ~6 | −0.50 | ZAP Docker setup was smooth; dependency audit is automated |
| k6 performance | 3.33 | ~3 | −0.33 | Script reuse and Docker k6 simplified execution |
| Reporting | 4.33 | ~5 | +0.67 | More comprehensive documentation than initially estimated |
| **Total** | **28.83** | **~29** | **+0.17** | **Within 1% of PERT estimate** |

### Analysis

The actual effort (~29 hours) fell within the 68% confidence interval (26.3–31.4 hours)
and closely matched the PERT expected value (28.83 hours). This suggests the three-point
estimation method was well-calibrated for this project scope.

The two areas that exceeded the most-likely estimate (Playwright automation and reporting)
were offset by areas that completed faster than the most-likely estimate (security, k6).

**Limitation:** Actual effort figures are retrospective assessments, not measured values.
The project did not use formal time-tracking tools. The figures should be treated as
approximate planning indicators, not precise time records.

---

## Assumptions

- One Student 3 contributor familiar with the repository.
- Functioning local environment with Docker, PostgreSQL, and all dev servers.
- Seeded test data available.
- No dependency changes or build-breaking updates during testing.
- Recovery testing effort is excluded (Student 2 responsibility).
- Team coordination waiting time is excluded.
