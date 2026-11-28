# Team Risk Register, 5x5 Matrix & Group Exit Criteria

**Module:** KitchenAsty Reservations  
**Date:** November 2026

---

## 1. Risk Register (8 Product Risks + 2 Project Risks + 2 Proposed Risks)

Likelihood (L) and Impact (I) scale: 1 (Lowest) to 5 (Highest).  
**Score = L × I:** Low (1–4), Medium (5–9), High (10–16), Critical (17–25).

| Risk ID | Category | L | I | Score / Level | Risk Description | Owner | Mitigation & Testing Technique | Linked Defect / Status |
|---|---|---:|---:|---|---|---|---|---|
| **R-P01** | Product | 4 | 5 | **20 Critical** | Double booking: System permits simultaneous overlapping bookings or unhandled create retries. | Member 2 | Concurrency integration tests; idempotent request handling. | [M2-D01](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/18), [M2-D03](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/20) |
| **R-P02** | Product | 4 | 4 | **16 High** | Invalid status transitions: Reservations skip lifecycle stages (e.g. `PENDING` -> `COMPLETED`). | Member 2 | State machine matrix verification; negative PATCH tests. | [M2-D04](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/21) |
| **R-P03** | Product | 4 | 5 | **20 Critical** | Table mismatch: Assigning undersized, inactive, or tables from other locations. | Member 1 & 2 | Boundary and cross-entity table validation checks. | [M2-D02](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/19), [M2-D05](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/22), [M2-D06](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/23) |
| **R-P04** | Product | 3 | 4 | **12 High** | Past bookings: Reservations accepted for elapsed calendar dates/times. | Member 1 | Date comparison guard prior to DB query. Verified in PR #8. | Resolved (PR #8) |
| **R-P05** | Product | 4 | 3 | **12 High** | Availability contract divergence: API doc specifies `{available, tables}` while API returns 22 slots. | Member 2 | Contract verification tests; OpenAPI alignment. | [M2-D09](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/26) |
| **R-P06** | Product | 3 | 3 | **9 Medium** | Duplicate table names within location: Concurrent creates produce naming collision. | Member 1 | Database unique constraints; table creation unit tests. | Monitored |
| **R-P07** | Product | 2 | 3 | **6 Medium** | Foreign key cascade block: Deleting a table with historic reservations is permanently rejected. | Member 1 | Negative delete test assertions. | Monitored |
| **R-P08** | Product | 3 | 4 | **12 High** | Staff IDOR: Staff can view or mutate reservations belonging to another branch. | Member 3 | Role-based authorization integration tests. | Monitored |
| **R-PR01** | Project | 4 | 3 | **12 High** | Toolchain metric permission blocker: SonarCloud Browse permission returns HTTP 403 for scratch metric. | Member 1 | Separate manual CFG derivation and document API blocker. | Documented |
| **R-PR02** | Project | 4 | 4 | **16 High** | Scope expansion: Testing unconstrained components outside Reservations jeopardizes deadline. | Shared | Strict scope fencing to reservations controllers and routes. | Mitigated |
| *M2-R01* | *Proposed* | 3 | 4 | *12 High* | Semantic date/clock invalidity: System accepts Feb 31 or invalid time formats. | Member 2 | Strict regex and date parser validation. | [M2-D07](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/24) (Proposed) |
| *M2-R02* | *Proposed* | 3 | 4 | *12 High* | Malformed input causes server hangs / unhandled rejections. | Member 2 | Global Express async error boundaries. | [M2-D08](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/25), [M2-D10](https://github.com/fizzaniaz17-arch/kitchen-nasty/issues/27) (Proposed) |

---

## 2. 5×5 Risk Heatmap

| Impact \ Likelihood | 1 (Rare) | 2 (Unlikely) | 3 (Possible) | 4 (Likely) | 5 (Almost Certain) |
|---|---:|---:|---:|---:|---:|
| **5 (Catastrophic)** | 5 Medium | 10 High | 15 High | **R-P01, R-P03** (20 Critical) | 25 Critical |
| **4 (Major)** | 4 Low | 8 Medium | **R-P04, R-P08, M2-R01\*, M2-R02\*** (12 High) | **R-P02, R-PR02** (16 High) | 20 Critical |
| **3 (Moderate)** | 3 Low | **R-P07** (6 Medium) | **R-P06** (9 Medium) | **R-P05, R-PR01** (12 High) | 15 High |
| **2 (Minor)** | 2 Low | 4 Low | 6 Medium | 8 Medium | 10 High |
| **1 (Insignificant)**| 1 Low | 2 Low | 3 Low | 4 Low | 5 Medium |

*\*Proposed by Member 2 pending group review.*

---

## 3. Group Exit / Release Criteria (3 Measurable Criteria Tied to Highest Risks)

| Exit Criterion ID | Tied Risk | Target & Measurable Requirement | Evidence Source | Actual Value Achieved | Release Decision Status |
|---|---|---|---|---|---|
| **EC-GROUP-01** | **R-P01 & R-P03** (Critical double bookings & table mismatches) | **Zero High/Critical unhandled booking conflicts or table capacity violations.** 100% of tested reservation booking and table assignment constraints must enforce positive rejection (4xx) without corrupting database state. | Member 2 PostgreSQL API Suite on PR #32 (`integration/sqe-reservation-final-review`, `66194b4057c13ea42b78bc693ed631395c3b0355`) | **PASSED on PR #32 (466/466 passed).** Historical PR #14 baseline had 36 failures; PR #32 resolves #18–#27 (transactional conflict locks, table eligibility, lifecycle transitions, date/query validation, idempotent retries). | **PASSED on PR #32** (pending merge to `main`) |
| **EC-GROUP-02** | **R-P01, R-P02, R-P03** (Core controller logic reliability) | **100% Statement & Branch Coverage + >=60% Mutation Score on Core Reservation Logic.** Quality gates must pass in CI without suppressing tests. | Member 1 Vitest LCOV & Stryker CI on PR #32 (run `45988707277`) | **PASSED.** 123/123 Member 1 tests passed; 100% statements, branches, functions, and lines on scoped controllers. Stryker mutation score achieved **70.98%** (60% break gate passed; CM-A & CM-B killed). | **PASSED** |
| **EC-GROUP-03** | **R-P08 & Defensive Security** | **Zero Critical/High Vulnerabilities in production runtime dependencies + Valid Security Headers enforced.** Clean SonarCloud Quality Gate on new code (Rating A). | SonarCloud PR #32 (`fizzaniaz17-arch_kitchen-nasty`), npm audit, Student 3 Security Report (`docs/sqe/student-3/`) | **PASSED.** SonarCloud PR #32 Quality Gate: **OK** (Reliability A, Security A, Maintainability A, 98.3% coverage, 0.0% duplication; `typescript:S2871` fixed; `plsql:CharVarchar` resolved as PostgreSQL false positives). | **PASSED** |

### Official Release Recommendation: **READY TO MERGE PR #32**
Following the integration of Member 2's defect fixes (#18–#27), Member 1's white-box/mutation/SonarCloud gates, and Member 3's security remediations on PR #32 (`66194b4057c13ea42b78bc693ed631395c3b0355`), all 15 hosted CI checks and all 3 group exit criteria (`EC-GROUP-01`–`EC-GROUP-03`) **PASS**. Note: `main` (`9b4ff76b`) remains held until PR #32 is merged, and the approved 9-point idempotency retention/PII/JWT-revocation hardening conditions remain tracked for production deployment.
