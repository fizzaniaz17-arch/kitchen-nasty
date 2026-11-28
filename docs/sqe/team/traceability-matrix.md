# End-to-End Requirement Traceability Matrix

This matrix establishes forward and backward traceability connecting **Functional Requirements** -> **Product Risks** -> **Business Rules** -> **Test Cases (Unit, API, E2E)** -> **Actual Outcome** -> **Defect Issue** -> **Owner & Resolution Status**.

---

## Traceability Table

| Req ID | Description | Risk | Rule | Test Verification Case | Expected Result | Actual Outcome | Defect / Issue | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| **REQ-RES-01** | Reject past reservation dates | R-P04 | Custom Guard | Vitest: `past-date.test.ts`<br>PR #8 regression suite | HTTP 400 `Cannot reserve in the past` | 400 returned, zero DB writes | Resolved in PR #8 | Member 1 | **VERIFIED PASS** |
| **REQ-RES-02** | Enforce party size between 1 and 50 | R-P03 | M1-BR-01 | Vitest: `reservation.test.ts` (0, 1, 50, 51)<br>API: EP/BVA generated cases | 1, 50 accept; 0, 51 reject (400) | Valid bounded; 0 & 51 rejected | None (Protected) | Member 1 & 2 | **VERIFIED PASS** |
| **REQ-RES-03** | Require authenticated customer & active location | R-P03, R-P08 | M1-BR-02 | Vitest: `mcc-mcdc.test.ts` (MCC-01..03)<br>Playwright: `UC-M1-01-MAIN` | Missing token: 401; Inactive: 400; Valid: 201 | Auth context verified, 201 booking created | PR #15 mock fix | Member 1 | **VERIFIED PASS** |
| **REQ-RES-04** | Return accurate 22 half-hour availability slots | R-P05 | M1-BR-04 | Vitest: `availability.test.ts`<br>API: `availability.api.test.ts` | 22 slots (11:00–21:30) with available flag | Daily slots returned; time query ignored | [Issue #26](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/26) (M2-D09) | Member 2 | **FAIL (Contract Mismatch)** |
| **REQ-RES-05** | Filter reservations by date, status, location | R-PR02 | Schema filter | API: `staff-list.api.test.ts`<br>Playwright: `UC-M1-02-MAIN` | Return matching filtered records | Valid filters match; malformed date hangs | [Issue #25](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/25) (M2-D08) | Member 2 | **PARTIAL (Hangs on malformed)** |
| **REQ-RES-06** | Assign eligible table (matching location, capacity) | R-P03 | Table logic | Playwright: `UC-M1-02-MAIN`<br>API: `table-assign.api.test.ts` | 200 persisted table; undersized rejected | Undersized table accepted (no check) | [Issue #19](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/19) (M2-D02) | Member 2 | **FAIL (Capacity Unchecked)** |
| **REQ-RES-07** | Prevent double booking same table & time slot | R-P01 | Conflict guard | API: `table-conflict.api.test.ts` | Second booking rejected (4xx) | Second booking accepted (Overbooking) | [Issue #20](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/20) (M2-D03) | Member 2 | **FAIL (Conflict Ignored)** |
| **REQ-RES-08** | Enforce status transition lifecycle | R-P02 | State Machine | Vitest: `status-lifecycle.test.ts`<br>API: `lifecycle-matrix.test.ts` | Invalid jumps return 4xx | 13 invalid jumps accepted as 200 | [Issue #21](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/21) (M2-D04) | Member 2 | **FAIL (Lifecycle Open)** |
| **REQ-RES-09** | Idempotency on duplicate create retry | R-P01 | Idempotency | API: `duplicate-booking.api.test.ts` | Single reservation ID for duplicate retry | Duplicate IDs created per request | [Issue #18](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/18) (M2-D01) | Member 2 | **FAIL (Retry Policy Open)** |
| **REQ-RES-10** | Safe error handling on malformed URI escape | M2-R02 | Express decode | API: `malformed-escape.api.test.ts` | Handled 400 client error | Unhandled 500 server crash response | [Issue #27](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/27) (M2-D10) | Member 2 | **FAIL (Unhandled 500)** |

---

## Cross-Workflow Verification Summary
- **Workflow 1 -> Workflow 2 Continuity:** Successfully verified by Member 1 Playwright flow (`UC-M1-01` creates booking -> `UC-M1-02` reads and assigns table to the exact same reservation ID).
- **Automated EP/BVA Execution:** All 296 generated partitions executed in Member 2 suite against PostgreSQL; 279 passed, 17 failed.
- **Root-Cause Defect Correlation:** Each failing requirement has been mapped to an active, publicly tracked GitHub issue ([#18–#27](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues)).
