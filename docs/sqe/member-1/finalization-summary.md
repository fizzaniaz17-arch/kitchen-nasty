# Member 1 SQE Audit Reconciliation & Handoff

**Prepared for:** Team Final Submission & Member 1 Viva Defense  
**Current Main Commit:** `9b4ff76b113878d754cfd73e1b5ef04e08cbf9f1`  
**Date:** 27 November 2026

---

## 1. Status Corrections & Historical Reconciliation

1. **Pull Request Statuses:**
   - **PR #6 (Party-size regression demo):** Historically triggered an intentional CI failure (`1eedc87cd139459b0f053e47d72bddc1f5de2e6c`). Merged on 22 November 2026.
   - **PR #8 (Past-date fail-to-pass fix):** Red-to-green bugfix demonstrating past-date rejection. Merged on 22 November 2026.
   - **PR #15 (Playwright mock correction):** Aligned `/api/auth/me` with `AuthContext`, fixing 4 failing general CI browser tests. Merged on 25 November 2026.
   - **PR #16 (SonarCloud Quality Gate remediation):** Resolved S9383 unhandled promises and S6505 workflow vulnerabilities, restoring SonarCloud rating to A. Merged on 25 November 2026.
   - **PR #14 (Member 2 API tests & EP/BVA):** Historical baseline on `sqe/member2-api-testing` (`6d9aa35a`).
   - **PR #32 (Final Integration Candidate):** `integration/sqe-reservation-final-review` (`66194b4057c13ea42b78bc693ed631395c3b0355`) — **All 15 CI/Quality Gate checks PASSED** (`Member 1 / 100% Coverage`, `Member 1 / Mutation 60%`, `Member 1 / Custom Mutations`, `Member 1 / Sonar Quality Gate`, `Member 1 / Required` run `45988707277`, `Member 2 / Reservation API` 466/466, `SonarCloud Code Analysis` Rating A).

2. **Coverage & Mutation Scoping Clarification:**
   - The reported **100% Statement, Branch, Function, and Line coverage** applies specifically to the scoped reservation business logic controllers: `packages/server/src/controllers/reservation.controller.ts` and `packages/server/src/controllers/table.controller.ts`.
   - It does *not* claim 100% coverage across the entire server repository (unscoped modules like loyalty, billing, and orders are outside the reservation boundary).
   - **Latest PR #32 Verification:** **123/123** Member 1 white-box tests passing, **100%** in all four coverage metrics, **70.98%** Stryker mutation score (above the unchanged 60% break threshold), and both custom mutations (CM-A, CM-B) killed.
   - **Historical `main` (`9b4ff76`) Baseline:** 57/59 tests, 65.47% mutation score (363 killed, 192 survived, 1 timeout, 0 errors).

3. **SonarCloud PR #32 Disposition Record:**
   - `typescript:S2871` (`AaIclxMg49OXPx-3xaGB`): **`CLOSED` / `FIXED`** in commit `66194b40`.
   - `plsql:CharVarchar` (`AaIclxOS49OXPx-3xaGE` & `AaIclxOS49OXPx-3xaGF` in `20261127150000_reservation_idempotency/migration.sql`): Verified PostgreSQL `CHAR(64)` false positives (Oracle-specific rule) and marked **`RESOLVED` / `FALSE-POSITIVE`**.
   - **PR #32 Quality Gate:** **`OK` (PASSED)** — Reliability **A**, Security **A**, Maintainability **A**, Coverage **98.3%**.

4. **Cyclomatic Complexity Comparison:**
   - **Manual CFG:** Evaluated for `updateReservation` function. Graph has 19 nodes, 26 edges, 1 connected component:
     $$V(G) = E - N + 2P = 26 - 19 + 2(1) = 9$$
     Corresponding to 8 explicit decision points plus formula baseline.
   - **SonarQube Metric Status:** While SonarCloud quality gates pass on PRs and `main`, querying the individual function-level complexity via the SonarCloud API returned **HTTP 403 Forbidden** due to Browse credential scoping. The manual CFG calculation stands as the verified primary evidence.

---

## 2. Member 1 Viva Defense Guide

Use these concise, verified technical answers during oral evaluation:

1. **Q: What is the difference between Statement Coverage and Branch Coverage?**
   - *A:* Statement coverage ensures every executable line of code runs at least once. Branch coverage ensures every decision outcome (both true and false branches) is evaluated. In `reservation.controller.ts`, achieving 100% branch coverage required testing both the presence and absence of each optional patch parameter (`status`, `tableId`, `date`, `time`, `partySize`, `comment`).

2. **Q: How does Multiple Condition Coverage (MCC) differ from MC/DC?**
   - *A:* MCC requires executing all $2^n$ possible combinations of atomic boolean conditions in a compound decision. Modified Condition/Decision Coverage (MC/DC) only requires $n+1$ test cases where each condition is shown to independently affect the decision outcome while holding other conditions fixed. For our rule `!location || !location.isActive`, JavaScript short-circuits evaluation when `!location` is true; MC/DC demonstrates independence using 3 feasible test rows instead of 4.

3. **Q: Why did some mutants survive in your Stryker mutation analysis?**
   - *A:* Out of 556 total mutants, 192 survived (65.47% killed). Analysis of >=15 survivors revealed:
     - *Equivalent mutants:* Mutation changes code but cannot alter runtime output (e.g., swapping `<=` for `<` when earlier boundary filters prevent equality).
     - *Syntactic logging/formatting mutants:* Mutating internal error log strings without altering the returned HTTP status code or client JSON response.
     - *Permissive mock oracles:* Vitest mocks that do not strictly check unasserted optional parameters passed down to database stubs.

4. **Q: Describe your red-to-green fail-to-pass pull request.**
   - *A:* PR #8 addressed missing past-date rejection. First, commit `d405f83` added a test asserting HTTP 400 for a past date; this failed with status 400 'Location not found or inactive', proving the defect. Second, commit `80f720c` implemented the calendar guard before DB access, turning the test green and preserving 100% branch coverage.

5. **Q: How did you prove that your CI quality gate actually blocks invalid merges?**
   - *A:* In PR #6, we introduced an intentional party-size boundary regression (`.max(50)` -> `.max(40)`). The GitHub Actions `Member 1 / Required` status check failed, triggering repository ruleset enforcement and blocking the merge. After capturing photographic proof of the blocked check, the fix was applied and merged.
