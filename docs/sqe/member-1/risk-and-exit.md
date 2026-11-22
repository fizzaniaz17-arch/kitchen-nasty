# Risk Register and Exit Criteria

Likelihood and impact use 1 (lowest) through 5 (highest). Score is `L × I`: Low 1–4, Medium 5–9, High 10–16, Critical 17–25.

| Risk | Type | L | I | Score/level | Owner | Mitigation and technique | Depth |
|---|---|---:|---:|---|---|---|---|
| R-P01 Double booking because creation does not enforce conflicts | Product | 4 | 5 | 20 Critical | Reservations owner | Transactional conflict check; MCC/concurrency integration tests | API + DB |
| R-P02 Invalid status jumps bypass lifecycle | Product | 4 | 4 | 16 High | Reservations owner | Transition map; state-transition tests | Unit + API |
| R-P03 Assigned table is too small, inactive, or from another location | Product | 4 | 5 | 20 Critical | Table owner | Validate assignment; boundary/MCC tests | Unit + integration |
| R-P04 Past reservations can be created | Product | 3 | 4 | 12 High | Reservations owner | Fixed and regression-tested in open PR #8; main remains exposed until review and merge | Unit + integration |
| R-P05 Availability contract differs from docs/client assumptions | Product | 4 | 3 | 12 High | API owner | Contract review and schema tests | API |
| R-P06 Race allows duplicate table names | Product | 3 | 3 | 9 Medium | DB owner | Composite unique constraint and concurrency test | DB integration |
| R-P07 Deleting any historically referenced table is permanently blocked | Product | 2 | 3 | 6 Medium | Product owner | Confirm retention policy; state/age partitions | API |
| R-P08 Staff list is not visibly scoped by staff location | Product | 3 | 4 | 12 High | Auth owner | Authorization requirement and IDOR tests | API/E2E |
| R-PR01 Function-level Sonar complexity for `updateReservation` is unavailable | Project | 4 | 3 | 12 High | Member 1 | Keep the manual CFG result separate; use an already approved single-function analysis scope or request approval before creating a scratch project | Static analysis |
| R-PR02 Coverage/mutation scope exceeds remaining schedule | Project | 4 | 4 | 16 High | Member 1 | Inventory, prioritize critical rules, daily evidence runs | Unit/tooling |

## 5×5 matrix

| Impact \ Likelihood | 1 | 2 | 3 | 4 | 5 |
|---|---:|---:|---:|---:|---:|
| 5 | 5 M | 10 H | 15 H | 20 C | 25 C |
| 4 | 4 L | 8 M | 12 H | 16 H | 20 C |
| 3 | 3 L | 6 M | 9 M | 12 H | 15 H |
| 2 | 2 L | 4 L | 6 M | 8 M | 10 H |
| 1 | 1 L | 2 L | 3 L | 4 L | 5 M |

## Exit criteria

| ID | Target and reason | Evidence | Actual | Status/release effect |
|---|---|---|---|---|
| EC-01 | 100% statement and branch coverage for selected server business logic; controls R-P01/R-P03 | Vitest LCOV and PR #8 Member 1 run | 59/59 passed; 100% statements, branches, functions, and lines at fix commit `80f720cc750accccb0e46004dbe8fe3d8e67928c`; application-code head `03d977cf352699dbfca919c4209056c1116e3818` gate passed | Pass |
| EC-02 | Mutation score at or above justified CI threshold and at least 15 survivors classified | Stryker output and PR #8 Member 1 run | Local score 64.78% (365 killed, 199 survived, no no-coverage mutants, 1 timeout) at `80f720cc750accccb0e46004dbe8fe3d8e67928c`; final PR mutation job passed | Pass (60% threshold) |
| EC-03 | Sonar quality gate passes; keep function-level complexity distinct | Main and PR Member 1 Sonar jobs; manual CFG | Main run `45004176915` and PR #8 final run `45008817893` passed. Manual `updateReservation` V(G)=9; function-level Sonar value remains unavailable | Gate pass; measurement pending |
| EC-04 | Required PR checks and repository CI pass; preserve intentional blocked demo | GitHub runs and PR status | Application-code head `03d977cf352699dbfca919c4209056c1116e3818` and report/evidence commit `1c56e714d3fd9f3f0e3d81ca469492713a54acdd` both passed required, CI, and Mobile Builds checks. PR #8 is open. PR #6 remains open/unmerged and intentionally blocked at `1eedc87cd139459b0f053e47d72bddc1f5de2e6c` | Pass on PR #8; review/merge pending |

## AI and viva record

AI assistance produced the initial test/configuration/documentation draft. Member 1 must verify every rule against source, rerun all commands at the reported commit, inspect survivor classifications, and explain any accepted threshold. Viva anchors: statement coverage executes statements while branch coverage proves outcomes; MCC enumerates feasible condition combinations while MC/DC demonstrates independent effect; mutation survivors may be equivalent, uncovered, or weakly asserted; `V(G)=9` comes from 26 edges and 19 nodes and 8 explicit decisions plus the formula baseline, not nine independent decisions; required checks only block merges when the repository ruleset names them. The past-date fix is verified on PR #8 but is not yet part of `main`.
