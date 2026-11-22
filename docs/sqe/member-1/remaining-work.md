# Remaining Work and How to Finish

## Completed and verified

- Main is still at `00f0449039601f0a5de1fd39e4d3365e9bbc0b77`; its post-merge Member 1 run `45004176915` passed.
- PR #6 is still open, targets `main`, and is unmerged. It remains the intentional blocked party-size demo. Its failed required check, merge box, and Actions run evidence are retained in `screenshots/`.
- The separate past-date fail-to-pass fix is PR #8: regression-only commit `d405f8326be9d8e2db29f60ff7005e4863b46eef`, production fix `80f720cc750accccb0e46004dbe8fe3d8e67928c`, and final integration-fixture correction `03d977cf352699dbfca919c4209056c1116e3818`.
- At application-code head `03d977cf352699dbfca919c4209056c1116e3818`, all Member 1, CI, and Mobile Builds checks passed. The report/evidence-only commit `1c56e714d3fd9f3f0e3d81ca469492713a54acdd` also passed the same workflow groups. PR #8 remains open for review; do not merge it as part of this evidence task.
- Final local Member 1 tests: 59/59 passed. Coverage: 100% statements, branches, functions, and lines. Mutation: 64.78%, exceeding the 60% threshold.

## Remaining: obtain function-level Sonar complexity for `updateReservation`

The manual CFG is verified as `E=26`, `N=19`, `P=1`, `V(G)=9` (eight explicit decisions plus the formula baseline). The Sonar quality gate passes for the latest PR, but its job does not provide a function-level complexity measurement; a controller-wide number is not an acceptable substitute.

**How to finish:** first determine whether an already approved Sonar project or component API can analyze only the exact unchanged function. If not, create a scratch project only after approval. Record the analyzer version, source SHA, analysis ID, exact indexed source scope, and function-level value, and save a genuine export or screenshot. The manual CFG remains valid at fix SHA `80f720cc750accccb0e46004dbe8fe3d8e67928c` because that commit changed `createReservation`, not `updateReservation`.

## After team review

PR #8 is open and all its checks pass. The past-date fix is therefore verified but is not yet in `main`. Once the team approves and merges PR #8, verify the resulting main SHA and its post-merge Member 1/Sonar runs; do not push directly to `main`.
