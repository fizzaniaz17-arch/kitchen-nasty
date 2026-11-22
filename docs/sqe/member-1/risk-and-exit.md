# Risk Register and Exit Criteria

Likelihood and impact use 1 (lowest) through 5 (highest). Score is `L × I`: Low 1–4, Medium 5–9, High 10–16, Critical 17–25.

| Risk | Type | L | I | Score/level | Owner | Mitigation and technique | Depth |
|---|---|---:|---:|---|---|---|---|
| R-P01 Double booking because creation does not enforce conflicts | Product | 4 | 5 | 20 Critical | Reservations owner | Transactional conflict check; MCC/concurrency integration tests | API + DB |
| R-P02 Invalid status jumps bypass lifecycle | Product | 4 | 4 | 16 High | Reservations owner | Transition map; state-transition tests | Unit + API |
| R-P03 Assigned table is too small, inactive, or from another location | Product | 4 | 5 | 20 Critical | Table owner | Validate assignment; boundary/MCC tests | Unit + integration |
| R-P04 Past reservations can be created | Product | 3 | 4 | 12 High | Reservations owner | Date rule; three-point boundary tests | Unit + E2E |
| R-P05 Availability contract differs from docs/client assumptions | Product | 4 | 3 | 12 High | API owner | Contract review and schema tests | API |
| R-P06 Race allows duplicate table names | Product | 3 | 3 | 9 Medium | DB owner | Composite unique constraint and concurrency test | DB integration |
| R-P07 Deleting any historically referenced table is permanently blocked | Product | 2 | 3 | 6 Medium | Product owner | Confirm retention policy; state/age partitions | API |
| R-P08 Staff list is not visibly scoped by staff location | Product | 3 | 4 | 12 High | Auth owner | Authorization requirement and IDOR tests | API/E2E |
| R-PR01 Sonar main baseline and quality gate are not established | Project | 4 | 3 | 12 High | Member 1 | Main-branch scan runs after the reviewed workflow PR is merged; resolve the recorded Sonar gate conditions | Pipeline |
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
| EC-01 | 100% statement and branch coverage for selected server business logic; controls R-P01/R-P03 | Vitest LCOV | 100% statements, 100% branches | Pass |
| EC-02 | Mutation score at or above justified CI threshold and at least 15 survivors classified | Stryker JSON/HTML | Historical 63.31%; latest 57-test follow-up 65.47%; historical 434/435 assertions closed; two custom operators killed | Pass |
| EC-03 | Sonar quality gate passes with imported LCOV and no blocker/critical issue in module | Sonar PR analysis and quality-gate API | Analysis at `f51b0c7c63ead6740d6de8b47024093df4f5b86f` completed; reliability C, security C, new-code coverage 0.0%, duplication 79.0%; `main` baseline not yet analyzed | Fail; blocks release |
| EC-04 | Required PR checks pass and branch rules block bypass | GitHub checks/ruleset evidence | PR #1 open; coverage/mutation/custom pass; Sonar and aggregate fail; separate E2E job fails before tests because Chromium is unsupported on `ubuntu26.04-x64` | Fail; blocks release |

## AI and viva record

AI assistance produced the initial test/configuration/documentation draft. Member 1 must verify every rule against source, rerun all commands at the reported commit, inspect survivor classifications, and explain any accepted threshold. Viva anchors: statement coverage executes statements while branch coverage proves outcomes; MCC enumerates feasible condition combinations while MC/DC demonstrates independent effect; mutation survivors may be equivalent, uncovered, or weakly asserted; `V(G)=9` comes from 26 edges and 19 nodes and 8 explicit decisions plus the formula baseline, not nine independent decisions; required checks only block merges when the repository ruleset names them.
