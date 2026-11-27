# Remaining Work and How to Finish

## Completed and verified

- Main is still at `00f0449039601f0a5de1fd39e4d3365e9bbc0b77`; its post-merge Member 1 run `45004176915` passed.
- PR #6 is still open, targets `main`, and is unmerged. It remains the intentional blocked party-size demo. Its failed required check, merge box, and Actions run evidence are retained in `screenshots/`.
- The separate past-date fail-to-pass fix is PR #8: regression-only commit `d405f8326be9d8e2db29f60ff7005e4863b46eef`, production fix `80f720cc750accccb0e46004dbe8fe3d8e67928c`, and final integration-fixture correction `03d977cf352699dbfca919c4209056c1116e3818`.
- At application-code head `03d977cf352699dbfca919c4209056c1116e3818`, all Member 1, CI, and Mobile Builds checks passed. The report/evidence-only commit `1c56e714d3fd9f3f0e3d81ca469492713a54acdd` also passed the same workflow groups. PR #8 remains open for review; do not merge it as part of this evidence task.
- Final local Member 1 tests: 59/59 passed. Coverage: 100% statements, branches, functions, and lines. Mutation: 64.78%, exceeding the 60% threshold.

## Remaining: obtain function-level Sonar complexity for `updateReservation`

The manual CFG is verified as `E=26`, `N=19`, `P=1`, `V(G)=9` (eight explicit decisions plus the formula baseline). The Sonar quality gate passes for the latest PR, but its job does not provide a function-level complexity measurement; a controller-wide number is not an acceptable substitute.

An approved SonarCloud scratch project has now analyzed the exact function from source SHA `03d977cf352699dbfca919c4209056c1116e3818`. SonarScanner CLI `8.0.1.6346` completed analysis `0e966ce9-1b82-4100-9fe6-3a2c959a7d6a` with exactly one indexed TypeScript file. Reading its complexity measure returned HTTP 403; the configured analysis credential cannot read that metric. The source scope, analysis ID, and blocker are recorded in `evidence/sonar-function-scratch-status.txt`.

**Minimum remaining action:** sign into SonarCloud with an identity that has Browse permission to the scratch project, or configure a separate protected credential with that permission, then retrieve the `complexity` measure for `updateReservation.ts`. Do not replace the working scan token unless its use for scanning is preserved. Record the returned value and screenshot/export; keep it distinct from the manual CFG value until then. The manual CFG remains valid at fix SHA `80f720cc750accccb0e46004dbe8fe3d8e67928c` because that commit changed `createReservation`, not `updateReservation`.

## After team review

PR #8 is open and all its checks pass. The past-date fix is therefore verified but is not yet in `main`. Once the team approves and merges PR #8, verify the resulting main SHA and its post-merge Member 1/Sonar runs; do not push directly to `main`.
