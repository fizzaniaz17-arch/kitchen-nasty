# Evidence Index

| Evidence | Command/environment | Baseline/result | Location |
|---|---|---|---|
| EV-GIT-01 | `git status --short --branch`; `git remote -v`; `git log -5 --oneline` / Windows PowerShell | Clean branch; origin team repo; `HEAD=d6af723` | `test-basis.md` |
| EV-TEST-01 | `npm run test:member1` / Node 24.15.0 | Historical 56/56 passed; latest follow-up 57/57 passed | Console; reproducible suite source |
| EV-COV-01 | `npm run coverage:member1` | 100% statements, branches, functions, and lines; gate passes | `packages/server/coverage/member-1/` |
| EV-MUT-01 | `npm run mutation:member1` / Stryker 9.1.1 | 556 total; 152 killed; 117 survived; 286 no coverage; 1 timeout; 27.52% | `reports/mutation/member-1/` |
| EV-MUT-02 | `npm run mutation:member1` before oracle strengthening | 298 killed; 257 survived; 0 no coverage; 1 timeout; 53.78%, gate failed | `reports/mutation/current-56-tests/` |
| EV-MUT-03 | `npm run mutation:member1` historical final | 351 killed; 204 survived; 0 no coverage; 1 timeout; 63.31%, 60% gate passed | `reports/mutation/final-56-tests/` |
| EV-MUT-04 | Follow-up `npm run mutation:member1` on branch `sqe/member-1-followup` with 57 tests | 363 killed; 192 survived; 0 no coverage; 1 timeout; 65.47%, 60% gate passed; mutants 434 and 435 killed | `reports/mutation/final-56-tests/mutation.json` |
| EV-CUSTOM-01 | isolated worktree, `.max(50)` → `.max(49)` | Killed: 55 passed, party-size-50 oracle failed | `custom-mutations.md` |
| EV-CUSTOM-02 | isolated worktree, `=== time` → `!== time` | Killed: 55 passed, availability oracle failed | `custom-mutations.md` |
| EV-E2E-01 | `npm run test:e2e:member1` / installed Chrome | 10/10 flows passed in 24.6s | `playwright-report/member-1/` and `browser-use-cases.md` |
| EV-CI-01 | PR #1 Actions run `44894584324`, analyzed SHA `f51b0c7c63ead6740d6de8b47024093df4f5b86f` | Coverage, mutation, and custom mutation passed; Sonar quality gate and aggregate required job failed; main-branch baseline scan is configured for a reviewed merge | [PR #1](https://github.com/fizzaniaz17-arch/kitchen-nasty/pull/1), [Actions run](https://github.com/fizzaniaz17-arch/kitchen-nasty/actions/runs/44894584324) |
| EV-SONAR-01 | Historical local `docker version` attempt | Blocked: Docker Desktop Linux engine pipe absent; superseded by Cloud analysis below | `quality-report.md` |
| EV-SONAR-02 | Historical SonarQube container health API | Pinned local server reached `UP`; the local scanner was not completed after Docker metadata became read-only | `quality-report.md` |
| EV-SONAR-03 | SonarQube Cloud PR analysis on SHA `f51b0c7c63ead6740d6de8b47024093df4f5b86f` | Analysis completed and imported LCOV; quality gate failed: reliability C, security C, new-code coverage 0.0%, duplicated lines 79.0%. Sonar Overview warns that `main` has not been analyzed yet. | [Sonar PR summary](https://sonarcloud.io/summary/new_code?id=fizzaniaz17-arch_kitchen-nasty&pullRequest=1), [quality gate API](https://sonarcloud.io/api/qualitygates/project_status?projectKey=fizzaniaz17-arch_kitchen-nasty&pullRequest=1), `screenshots/sonar-*.png` |
| EV-CI-02 | Repository CI E2E job in run `44894584281` | Failed before tests: `Playwright does not support chromium on ubuntu26.04-x64`; this is separate from the Member 1 workflow | [E2E job](https://github.com/fizzaniaz17-arch/kitchen-nasty/actions/runs/44894584281/job/136817420810) |
| EV-SS-01 | Installed Chrome driven by Playwright | Coverage and mutation HTML proof screenshots captured | `docs/sqe/member-1/screenshots/` |
| EV-SS-02 | SonarQube Cloud and GitHub Actions pages for SHA `f51b0c7c63ead6740d6de8b47024093df4f5b86f` | Overview, new-code coverage, quality gate, and Sonar job screenshots captured; quality gate failure is preserved | `screenshots/sonar-overview.png`, `sonar-coverage.png`, `sonar-quality-gate.png`, `actions-sonar-job.png` |
| EV-PDF-01 | Chromium `page.pdf()` from committed HTML | PDF report generated with CFG, MCC/MC/DC, metrics and screenshots | `docs/sqe/member-1/KitchenAsty-Member-1-SQE-Report.pdf` |

GitHub PR, workflow, Sonar API, screenshots, custom operators, browser-flow evidence, and final survivor reruns remain pending and must be added with durable URLs/commit SHAs rather than estimates.
