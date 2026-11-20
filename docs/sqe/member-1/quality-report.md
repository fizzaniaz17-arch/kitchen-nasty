# Static, Coverage, and Mutation Report

## Toolchain

- Node `v24.15.0`, npm `11.12.1` locally. CI currently selects Node 22.
- TypeScript `^5.7.0`, Express `^4.21.0`, Prisma/client `^5.22.0`, Vitest `4.0.18`, Playwright `1.58.2` resolved from the project manifests/lockfile.
- Added exact `@vitest/coverage-v8 4.0.18`, `@stryker-mutator/core 9.1.1`, and `@stryker-mutator/vitest-runner 9.1.1`.

## Manual CFG: `updateReservation`

```mermaid
flowchart TD
  A([Entry]) --> B[Parse body]
  B --> C{Parse success?}
  C -- no --> X[400 response]
  C -- yes --> D[Find reservation]
  D --> E{Exists?}
  E -- no --> Y[404 response]
  E -- yes --> F[Initialize data]
  F --> G{status supplied?}
  G --> H{tableId supplied?}
  H --> I{date supplied?}
  I --> J{time supplied?}
  J --> K{partySize supplied?}
  K --> L{comment supplied?}
  L --> M[Prisma update]
  M --> N[200 JSON response]
  X --> Z([Exit])
  Y --> Z
  N --> Z
```

Each optional decision has a true assignment edge and a false bypass edge before joining the next decision. With those assignment nodes expanded, the verified graph has 19 nodes and 26 edges, one connected component, so `V(G) = E - N + 2 = 26 - 19 + 2 = 9`. This matches the nine independent decisions: parse success, existence, and six optional fields plus the entry-to-shared-exit structure represented by the formula. Promise rejection, Prisma exceptions, `new Date` behavior, Express failures, and Zod internals are implicit exceptions omitted from the graph.

No function-level analyzer value is available yet. A whole-file Sonar complexity value must not be compared to 9.

## Coverage run

Command: `npm run coverage:member1`

- Test result: 50 passed, 0 failed.
- Full selected-controller denominator: 100% statements, 100% branches, 100% functions, 100% lines.
- Gate: passed. The assignment target of 100% statements and branches is met.
- Uncovered code: none in the declared reservation/table controller denominator.
- Release effect: the white-box coverage criterion passes; mutation, Sonar, and CI criteria remain independent blockers.
- LCOV: `packages/server/coverage/member-1/lcov.info`.

## Mutation baseline

Command: `npm run mutation:member1`; duration 43 seconds; targets were exactly the reservation and table controllers; 20 Member 1 tests executed.

| Metric | All | Reservation | Table |
|---|---:|---:|---:|
| Mutants | 556 | 429 | 127 |
| Killed | 152 | 118 | 34 |
| Survived | 117 | 88 | 29 |
| No coverage | 286 | 222 | 64 |
| Timed out | 1 | 1 | 0 |
| Tool errors | 0 | 0 | 0 |
| Overall mutation score | 27.52% | 27.74% | 26.77% |
| Covered mutation score | 56.67% | 57.49% | 53.97% |

The overall denominator includes no-coverage mutants; the covered score excludes them. The run failed the configured 60% breaking threshold. Raw machine-readable results are in `reports/mutation/member-1/mutation.json`; the HTML report is `reports/mutation/member-1/index.html`.

The baseline report is preserved unchanged to maintain chronology; later runs use distinct output directories.

The expanded 56-test run first scored 53.78% (298 killed, 257 survived, no no-coverage mutants, one timeout). Exact response and dependency-call assertions raised the final result to 63.31% (351 killed, 204 survived, no no-coverage mutants, one timeout), passing the unchanged 60% break threshold. Fifteen genuine survivors and their matched final outcomes are documented in `mutation-analysis.md`; both deterministic custom operators were killed as recorded in `custom-mutations.md`.

## SonarQube blocker

Docker Desktop Engine `29.5.3` was started and `sonarqube:25.11.0.114957-community` reached API status `UP`. The first scanner attempt used a nonexistent scanner tag and performed no analysis. During the disposable instance reset, Docker reported its metadata database as read-only and its engine then stopped responding. Therefore no completed background task, metrics, ratings, or Sonar dashboard screenshots are claimed. `sonar-project.properties` defines production/test scope and imports the exact Member 1 LCOV path. Repair or manually restart Docker Desktop, then use verified scanner tag `sonarsource/sonar-scanner-cli:11.5.0.2154_7.3.0` and capture the resulting dashboard.
