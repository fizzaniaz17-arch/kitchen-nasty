# Weekly Progress, Control Actions & GQM Metrics

**Team Project:** KitchenAsty SQE Final Project  
**Module:** Reservations Subsystem  
**Period:** November 2026

---

## 1. Weekly Chronology & Control Actions Taken

### Week 1: Baseline Establishment, Scope Fencing & Static Analysis
- **Milestones:** Cloned and explored upstream `mighty840/kitchenasty` (baseline `d6af723`). Refactored team scope from outdated menu-management to **Reservations**. Configured SonarQube Cloud scanner in CI (`.github/workflows/member1-quality.yml`).
- **Deviations Encountered:** Local Docker engine failures prevented local SonarQube execution. Sonar PR #1 analysis initially failed quality gate on new-code coverage due to scanning `e2e` directories.
- **Control Actions Taken:** Migrated fully to SonarCloud hosted scanner. Configured path exclusions (`sonar.exclusions`) to isolate test and non-production files, establishing an authentic baseline scan on `main`.

### Week 2: White-Box Unit Testing, MCC/MC/DC & Mutation Analysis
- **Milestones:** Built comprehensive unit suite (59 tests) achieving 100% statement, branch, function, and line coverage across `reservation.controller.ts` and `table.controller.ts`. Enforced MCC and MC/DC on multi-condition location validation (`M1-BR-02`).
- **Deviations Encountered:** Initial Stryker mutation score was 27.52% (below 60% break threshold) due to unasserted response attributes and broad controller paths.
- **Control Actions Taken:** Implemented oracle strengthening with strict response payload and Prisma parameter checks. Progressively lifted mutation score: 53.78% -> 63.31% -> **65.47%** (363 killed, 192 survived). Implemented and killed two custom deterministic mutation operators (CM-A and CM-B).

### Week 3: CI/CD Quality Gates, Fail-to-Pass Demonstration & Defect Triage
- **Milestones:** Demonstrated quality gate blocking behavior via controlled party-size regression (PR #6). Executed red-to-green bugfix for past-date bookings (PR #8). Member 2 integrated 382 PostgreSQL API tests and EP/BVA generator (PR #14).
- **Deviations Encountered:** General CI failed on 4 Playwright storefront tests due to `/api/auth/me` mock shape mismatch. SonarCloud quality gate failed on PR #14 (Security Rating C) due to hardcoded credential regex and unhandled `npx` script risks.
- **Control Actions Taken:** Corrected Member 1 Playwright mock to match `AuthContext` (`{ customer }`), restoring 10/10 browser tests to green. Remediated YAML credential naming (`MEMBER2_DB_SECRET`) and unhandled promises, returning SonarCloud gate to **Rating A**.

---

## 2. GQM (Goal-Question-Metric) Framework

### Goal 1: Ensure High Functional Requirement Verification
- **Question 1.1:** What proportion of documented reservation requirements are verified through automated tests?
  - **Metric: Requirements Coverage (%)**
  - **Formula:** $\frac{\text{Requirements with Verified Automated Tests}}{\text{Total Documented Functional Requirements}} \times 100$
  - **Calculation:**
    - Total Functional Requirements: 10
    - Fully Verified Requirements Passing: 3 (REQ-RES-01, REQ-RES-02, REQ-RES-03)
    - Tested Requirements Exposing Implementation Gaps: 7 (REQ-RES-04 through REQ-RES-10)
    - **Total Requirements Covered by Automated Tests:** 10 / 10 = **100%**
    - **Requirements Passing Status:** 3 / 10 = **30%** (70% failing / pending team policy resolution)

### Goal 2: Quantify Application Defect Density Across Core Code
- **Question 2.1:** How many defects were discovered per thousand lines of reservation application code?
  - **Metric: Defect Density (Defects / KLOC)**
  - **Formula:** $\frac{\text{Total Logged Defects (M2-D01 to M2-D10)}}{\text{Executable Lines of Code in Scoped Controllers (KLOC)}} \times 1000$
  - **Calculation:**
    - Scoped production code: `reservation.controller.ts` (452 lines) + `table.controller.ts` (112 lines) = 564 LOC = **0.564 KLOC**.
    - Confirmed candidate defect issues logged: **10** (GitHub Issues #18–#27).
    - **Defect Density:** $\frac{10}{0.564} \approx$ **17.73 defects per KLOC**.
  - **Interpretation:** Demonstrates high defect detection efficacy of boundary value and state-transition testing against the existing upstream code.

### Goal 3: Monitor Defect Triage & Resolution Stability
- **Question 3.1:** What percentage of reported defects were reopened after being marked fixed?
  - **Metric: Defect Reopen Rate (%)**
  - **Formula:** $\frac{\text{Number of Reopened Defects}}{\text{Total Closed/Resolved Defects}} \times 100$
  - **Calculation:**
    - Total defect issues logged: 10 ([#18–#27](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues)).
    - Total closed / resolved issues in this triage period: 0 (All 10 remain deliberately open for team policy review).
    - Reopened defects: 0.
    - **Audit Observation:** Because Issues #18–#27 are currently open in triage awaiting policy decisions (retry idempotency, cancellation semantics, availability contract), the reopen rate during the active audit window is **0% (0 reopened out of 0 closed)**. No churn has occurred on resolved items.
