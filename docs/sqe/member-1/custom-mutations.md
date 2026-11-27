# Custom Mutation Operators

Both operators ran in a detached Git worktree at checkpoint `c577f93`. The primary checkout retained original production source. The worktree was removed after execution; tracked primary files were verified/restored from the checkpoint and dependencies were reinstalled from `package-lock.json` after a Windows junction cleanup issue.

| Operator | Rule | Original | Mutated | Command/oracle | Actual result |
|---|---|---|---|---|---|
| CM-A inclusive maximum shift | BR-01 | `.max(50)` | `.max(49)` | `npm run test:member1`; party-size 50 must persist and return 201 | Killed: 55 passed, only `accepts boundary or adjacent party size 50` failed because no reservation write occurred |
| CM-B cross-time conflict | BR-04 | `r.time === time && r.tableId` | `r.time !== time && r.tableId` | `npm run test:member1`; 11:00 occupied and 11:30 free | Killed: 55 passed, only availability oracle failed; mutant returned 11:00 available instead of unavailable |

These are application-specific because they alter the declared inclusive booking limit and the table-conflict time equivalence relation. They overlap transformations a general mutator may produce, but the harness applies one exact guarded source change per isolated execution and names the business-rule oracle that must kill it.
