# Additional Screenshot Evidence

Captured 22 November 2026. These screenshots were supplied in the workspace and are preserved as evidence; they are not edited.

| Screenshot | What it shows |
|---|---|
| [Screenshot 2026-11-22 133610.png](./Screenshot%202026-11-22%20133610.png) | Local Member 1 test and coverage run: 58 tests passed and controller coverage is 100%; mutation run starts below. |
| [Screenshot 2026-11-22 133825.png](./Screenshot%202026-11-22%20133825.png) | Stryker output: 64.21% mutation score, above the configured 60% threshold. This is a separate, later run than the previously documented 65.47% result. |
| [Screenshot 2026-11-22 134641.png](./Screenshot%202026-11-22%20134641.png) | GitHub Member 1 Quality Gates job #11 after PR #5 merge; coverage, mutation, custom mutation, Sonar, and Required are green. Commit shown: `00f0449`. |
| [Screenshot 2026-11-22 134956.png](./Screenshot%202026-11-22%20134956.png) | SonarQube Cloud main-branch summary showing the quality gate passed for analysis `00f04490`. |
| [Screenshot 2026-11-22 135131.png](./Screenshot%202026-11-22%20135131.png) | Sonar issues list. It shows a password-remediation finding and workflow findings; no credential value is exposed. |
| [Screenshot 2026-11-22 135243.png](./Screenshot%202026-11-22%20135243.png) | Sonar project overview: overall coverage 4.4%, duplications 5.1%, security rating E, 59 security issues. |
| [Screenshot 2026-11-22 135319.png](./Screenshot%202026-11-22%20135319.png) | Sonar project Measures page for overall coverage, with 321/321 files represented. It is not the selected-controller Vitest coverage metric. |
| [Screenshot 2026-11-22 135358.png](./Screenshot%202026-11-22%20135358.png) | Additional Sonar project measures: security rating A, zero hotspots, reliability rating C, and 354 reliability issues. |
| [Screenshot 2026-11-22 135514.png](./Screenshot%202026-11-22%20135514.png) | Sonar overview snapshot with quality gate passed, 627 issues, 5.1% duplication, 4.4% coverage, and security rating E. |
| [Screenshot 2026-11-22 140659.png](./Screenshot%202026-11-22%20140659.png) | Local failing boundary test output for the synthetic party-size defect: 2 failed and 56 passed. |
| [Screenshot 2026-11-22 141015.png](./Screenshot%202026-11-22%20141015.png) | GitHub pull request merge box for `demo/blocked-party-size-v2`: `Member 1 / Required` is marked Required and failed; merge button is disabled while checks are failing/in progress. |
| [Screenshot 2026-11-22 141104.png](./Screenshot%202026-11-22%20141104.png) | GitHub Actions run #12 for PR #6, `demo/blocked-party-size-v2`, showing the party-size regression workflow failed. |
| [pr6-member1-blocked-run-1eedc87.png](./pr6-member1-blocked-run-1eedc87.png) | Live GitHub Actions run `45007186708` for PR #6 at `1eedc87`; coverage and mutation failed, `Member 1 / Required` failed, and Sonar was skipped. |
| [pr8-member1-red-d405f83.png](./pr8-member1-red-d405f83.png) | Live GitHub Actions run `45007936801` for PR #8 at regression-only commit `d405f83`; the required Member 1 gate failed before the production fix. |
| [pr8-member1-green-03d977c.png](./pr8-member1-green-03d977c.png) | Live GitHub Actions run `45008817893` for PR #8 at application-code head `03d977c`; coverage, mutation, custom mutation, Sonar Quality Gate, and `Member 1 / Required` passed. |

Two other supplied files, `Screenshot 2026-11-22 141720.png` and `Screenshot 2026-11-22 141854.png`, show an unrelated Student 3 mobile-build workflow and are intentionally not included as Member 1 evidence.
