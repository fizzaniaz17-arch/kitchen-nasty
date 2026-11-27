# Mutation Analysis

## Run chronology

| Run | Tests | Killed | Survived | No coverage | Timeout | Errors | Score | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Baseline (`1976b6c`) | 20 | 152 | 117 | 286 | 1 | 0 | 27.52% overall; 56.67% covered | Fail |
| Current before oracle strengthening | 56 | 298 | 257 | 0 | 1 | 0 | 53.78% | Fail |
| Final after oracle strengthening | 56 | 351 | 204 | 0 | 1 | 0 | 63.31% | Pass (60% break threshold) |
| Follow-up after exact table lookup oracle | 57 | 363 | 192 | 0 | 1 | 0 | 65.47% | Pass (60% break threshold) |

Stryker counts `Killed + TimedOut` as detected for the score and excludes tool errors. In the baseline, the covered score excluded `NoCoverage`; once the complete suite covered every mutant, overall and covered scores became identical.

## Fifteen genuine current-run survivors

All IDs and locations below come from `reports/mutation/current-56-tests/mutation.json`. Final dispositions were matched by the same ID, file, location, operator, and replacement in `reports/mutation/final-56-tests/mutation.json`.

| ID | File:line | Operator / mutation | Rule | Classification and evidence | Test improvement | Final |
|---:|---|---|---|---|---|---|
| 50 | reservation:34 | `===` → `!==` for customer type | BR-02 | Weak assertion: accepted customer tests did not distinguish the selected principal robustly | Exact rejection bodies and DB interaction assertions | Killed |
| 60 | reservation:38 | staff error payload → `{}` | BR-02 | Weak assertion: status/no-write checked, body omitted | Assert exact staff error object | Killed |
| 61 | reservation:38 | `success:false` → `true` | BR-02 | Weak assertion | Assert exact staff error object | Killed |
| 62 | reservation:38 | staff message → empty | BR-02 | Weak assertion | Assert exact staff error object | Killed |
| 63 | reservation:41 | anonymous error payload → `{}` | BR-02 | Weak assertion | Assert exact anonymous error object | Killed |
| 64 | reservation:41 | `success:false` → `true` | BR-02 | Weak assertion | Assert exact anonymous error object | Killed |
| 65 | reservation:41 | anonymous message → empty | BR-02 | Weak assertion | Assert exact anonymous error object | Killed |
| 66 | reservation:46 | location lookup argument → `{}` | BR-02 | Weak assertion: lookup result mocked without query oracle | Assert exact location lookup | Killed |
| 67 | reservation:46 | lookup `where` → `{}` | BR-02 | Weak assertion | Assert exact location lookup | Killed |
| 74 | reservation:48 | location error payload → `{}` | BR-02 | Weak assertion | Assert exact inactive/missing error | Killed |
| 75 | reservation:48 | `success:false` → `true` | BR-02 | Weak assertion | Assert exact inactive/missing error | Killed |
| 76 | reservation:48 | location message → empty | BR-02 | Weak assertion | Assert exact inactive/missing error | Killed |
| 434 | table:16 | location lookup argument → `{}` | Table workflow | Missing query assertion in the original list-table test | Exact `findUnique({ where: { id: 'loc-downtown' } })` assertion in the strengthened list-table test | Killed |
| 435 | table:16 | lookup `where` → `{}` | Table workflow | Missing query assertion in the original list-table test | Exact `{ where: { id: 'loc-downtown' } }` assertion plus exact table query arguments | Killed |
| 440 | table:18 | location error payload → `{}` | Table workflow | Weak assertion | Assert exact missing-location error | Killed |

None of these 15 was classified equivalent: every mutation changes an observable response or dependency call. In the follow-up 57-test rerun, mutants 434 and 435 were both killed by exact location lookup assertions; no two-query-gap survivor remains.
