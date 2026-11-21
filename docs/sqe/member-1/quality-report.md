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

- Test result: 56 passed, 0 failed (21 November 2026 verification run).
- Selected-controller denominator: 191/191 statements (100%), 99/99 branches (100%), 23/23 functions (100%), and 178/178 lines (100%).
- `reservation.controller.ts`: 134/134 statements, 75/75 branches, 18/18 functions, and 121/121 lines (all 100%).
- `table.controller.ts`: 57/57 statements, 24/24 branches, 5/5 functions, and 57/57 lines (all 100%).
- Gate: passed. The assignment target of 100% statements and branches is met.
- Uncovered code: none in the declared reservation/table controller denominator.
- Release effect: the white-box coverage criterion passes; mutation, Sonar, and CI criteria remain independent blockers.
- LCOV: `packages/server/coverage/member-1/lcov.info`.
- Browser-rendered report evidence: `screenshots/coverage-overview.png`; machine-readable summary: `packages/server/coverage/member-1/coverage-summary.json`.

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

## SonarQube Cloud PR analysis

PR #1 was analyzed by workflow run `44894584324` at SHA `f51b0c7c63ead6740d6de8b47024093df4f5b86f`, against base SHA `d6af7237e9569ebeab19ccab375362f9d144e25e`. The coverage artifact downloaded successfully, the `lcov.info` pre-scan check passed, and SonarQube Cloud uploaded and processed the analysis. The scanner then exited with code 3 because the quality gate failed; this was not a scanner startup or token/organization configuration error.

| Quality gate condition | Actual | Required | Result |
|---|---:|---:|---|
| New reliability rating | C | A | Fail |
| New security rating | C | A | Fail |
| New-code coverage | 0.0% on 94 new lines to cover | At least 80.0% | Fail |
| New duplicated lines | 79.0% (79.03% in the UI) | At most 3.0% | Fail |

The PR summary reports 19 new issues. The coverage upload/import completed; Sonar's new-code scope counted 94 lines under `e2e`, which are not covered by the imported controller LCOV file. This is distinct from the Member 1 controller coverage result above (100% statements and branches). The high duplication and C reliability/security ratings are also actual gate failures, not treated as passing.

The SonarQube Cloud project Overview shows the exact warning: **`'main' branch has not been analyzed yet.`** No scanner error said that PR analysis was impossible; the PR analysis completed. To establish the baseline through review rather than a direct push, the workflow now also runs on pushes to `main`. That baseline run will occur only after the open PR is reviewed and merged by the team; no direct push or merge was performed.

Screenshots for the Overview, PR new-code coverage, quality gate, and Actions Sonar job are saved in `screenshots/sonar-overview.png`, `screenshots/sonar-coverage.png`, `screenshots/sonar-quality-gate.png`, and `screenshots/actions-sonar-job.png`. They document analyzed SHA `f51b0c7c63ead6740d6de8b47024093df4f5b86f`.

The earlier local Docker/SonarQube attempts remain historical evidence only: Docker Desktop reached a read-only metadata failure before a local scan. They are superseded by this completed Cloud analysis.

## Other PR check failure

The repository's separate E2E job failed before running tests with the exact error `Playwright does not support chromium on ubuntu26.04-x64`. The Member 1 coverage, mutation, and custom-mutation jobs passed. The aggregate Member 1 job failed because the Sonar quality gate failed.
