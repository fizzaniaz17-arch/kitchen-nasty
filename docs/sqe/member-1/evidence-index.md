# Evidence Index

| Evidence | Command/environment | Baseline/result | Location |
|---|---|---|---|
| EV-GIT-01 | `git status --short --branch`; `git remote -v`; `git log -5 --oneline` / Windows PowerShell | Clean branch; origin team repo; `HEAD=d6af723` | `test-basis.md` |
| EV-TEST-01 | `npm run test:member1` / Node 24.15.0 | 56/56 passed | Console; reproducible suite source |
| EV-COV-01 | `npm run coverage:member1` | 100% statements, branches, functions, and lines; gate passes | `packages/server/coverage/member-1/` |
| EV-MUT-01 | `npm run mutation:member1` / Stryker 9.1.1 | 556 total; 152 killed; 117 survived; 286 no coverage; 1 timeout; 27.52% | `reports/mutation/member-1/` |
| EV-MUT-02 | `npm run mutation:member1` before oracle strengthening | 298 killed; 257 survived; 0 no coverage; 1 timeout; 53.78%, gate failed | `reports/mutation/current-56-tests/` |
| EV-MUT-03 | `npm run mutation:member1` final | 351 killed; 204 survived; 0 no coverage; 1 timeout; 63.31%, 60% gate passed | `reports/mutation/final-56-tests/` |
| EV-CUSTOM-01 | isolated worktree, `.max(50)` → `.max(49)` | Killed: 55 passed, party-size-50 oracle failed | `custom-mutations.md` |
| EV-CUSTOM-02 | isolated worktree, `=== time` → `!== time` | Killed: 55 passed, availability oracle failed | `custom-mutations.md` |
| EV-E2E-01 | `npm run test:e2e:member1` / installed Chrome | 10/10 flows passed in 24.6s | `playwright-report/member-1/` and `browser-use-cases.md` |
| EV-CI-01 | workflow definition review | Coverage, mutation, custom, Sonar and aggregate required jobs added; remote execution pending push/PR | `.github/workflows/member1-quality.yml` |
| EV-SONAR-01 | `docker version` | Blocked: Docker Desktop Linux engine pipe absent | `quality-report.md` |
| EV-SONAR-02 | SonarQube container health API | Pinned server reached `UP`; scanner was not completed after Docker metadata became read-only | `quality-report.md` and PDF blocker section |
| EV-SS-01 | Installed Chrome driven by Playwright | Coverage and mutation HTML proof screenshots captured | `docs/sqe/member-1/screenshots/` |
| EV-PDF-01 | Chromium `page.pdf()` from committed HTML | PDF report generated with CFG, MCC/MC/DC, metrics and screenshots | `docs/sqe/member-1/KitchenAsty-Member-1-SQE-Report.pdf` |

GitHub PR, workflow, Sonar API, screenshots, custom operators, browser-flow evidence, and final survivor reruns remain pending and must be added with durable URLs/commit SHAs rather than estimates.
