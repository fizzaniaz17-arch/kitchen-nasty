# Evidence Index

| Evidence | Command/environment | Baseline/result | Location |
|---|---|---|---|
| EV-GIT-01 | `git status --short --branch`; `git remote -v`; `git log -5 --oneline` / Windows PowerShell | Clean branch; origin team repo; `HEAD=d6af723` | `test-basis.md` |
| EV-TEST-01 | `npm run test:member1` / Node 24.15.0 | 20/20 passed | Console; reproducible suite source |
| EV-COV-01 | `npm run coverage:member1` | Tests pass; gate fails at 50.78% statements, 46.46% branches | `packages/server/coverage/member-1/` |
| EV-MUT-01 | `npm run mutation:member1` / Stryker 9.1.1 | 556 total; 152 killed; 117 survived; 286 no coverage; 1 timeout; 27.52% | `reports/mutation/member-1/` |
| EV-SONAR-01 | `docker version` | Blocked: Docker Desktop Linux engine pipe absent | `quality-report.md` |

GitHub PR, workflow, Sonar API, screenshots, custom operators, browser-flow evidence, and final survivor reruns remain pending and must be added with durable URLs/commit SHAs rather than estimates.
