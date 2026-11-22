# Remaining Work and How to Fix It

## 1. Trigger live workflows for the follow-up branch

**Status:** commit `4924789` is pushed on `sqe/member-1-followup`, but no branch-specific Actions run was created at the first check.

**Fix:** open a pull request from `sqe/member-1-followup` to `main`. Both `CI` and `Member 1 Quality Gates` will run. Save the PR URL, analyzed SHA, run URLs, and all artifacts. Re-run failed steps only after reviewing their exact logs.

## 2. Capture authenticated Sonar evidence

**Status:** public Sonar API exports are stored in `evidence/`. The signed-in Sonar page must still be used for exact quality-gate conditions and overview screenshots.

**Fix:** enable `/computer on`, open SonarCloud, view the analysis for SHA `46a942874deaf7f578e79461e1806603de107513`, and save the overview, quality gate, coverage, and issues screenshots in `screenshots/`.

## 3. Capture a GitHub fail-to-pass fix PR

**Prepared evidence:**

- Branch: `demo/fix-fail-to-pass`
- Red commit: `fe2585c`
- Fix commit: `2cccd05`
- Red local run: 55 passed, 2 failed
- Green local run: 57 passed
- PR creation: https://github.com/fizzaniaz17-arch/kitchen-nasty/pull/new/demo/fix-fail-to-pass

**Fix:** create a dedicated defect branch from `origin/main`. Commit a test that requires party size 50 to be accepted and party size 51 to be rejected. Introduce the controlled `.max(49)` defect on the defect commit, capture the failing test and Actions run, apply the `.max(50)` fix, and capture the passing run.

## 4. Create and verify a blocked PR

**Prepared evidence:**

- Branch: `demo/blocked-party-size`
- Defect commit: `6fb10af`
- Local red run: 55 passed, 1 failed
- PR creation: https://github.com/fizzaniaz17-arch/kitchen-nasty/pull/new/demo/blocked-party-size

**Fix:** create a separate branch from `origin/main` and introduce a `.max(49)` party-size defect. Open the PR and wait for `Member 1 / Required` to fail. Inspect GitHub Branches/Rulesets and verify `Member 1 / Required` is the stable required check. Capture the merge box showing merge is blocked.

## 5. Obtain function-level Sonar complexity

**Status:** manual complexity is verified as 9 (`E=26`, `N=19`, `P=1`, `V(G)=9`).

**Fix:** use the signed-in Sonar component API or create an approved scratch project that analyzes only the exact unchanged `updateReservation` source. Record project key, analysis ID, scanner version, source SHA, and measured complexity.

## 6. Add PR screenshots and merge-block evidence

Capture and add:

- Member 1 aggregate check.
- Repository E2E job.
- Sonar main overview and quality gate.
- Sonar coverage and relevant measures.
- Fix PR failing run and passing run.
- Blocked PR failed run and merge-blocked merge box.
