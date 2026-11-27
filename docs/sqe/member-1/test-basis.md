# Member 1 Test Basis

## Baseline

- Repository: `https://github.com/fizzaniaz17-arch/kitchen-nasty.git`
- Branch: `sqe/member-1-static-analysis`
- Verified baseline and current `HEAD` at inspection: `d6af7237e9569ebeab19ccab375362f9d144e25e` (`chore: release 0.3.2 (#63)`).
- The baseline is contained by both `main` and `sqe/member-1-static-analysis`; their merge-base was the same commit.
- No merge, rebase, cherry-pick, revert, bisect, sequencer, or `git am` operation was pending.

## Workflows

| ID | Initial state | Actor/action | Expected result | Shared records |
|---|---|---|---|---|
| WF-RES-CUSTOMER | Active location and customer account; active tables may exist | Customer checks availability and submits date, time, party size, and comment | Available slots reflect active tables with enough capacity and non-cancelled assignments; accepted booking is persisted as `PENDING` | `Customer`, `Location`, `Table`, `Reservation` |
| WF-RES-STAFF | Existing reservation and location tables | Staff lists reservations, assigns a table, and advances status | Reservation and assignment are updated; status follows the documented lifecycle; referenced tables cannot be deleted | `User`, `Location`, `Table`, `Reservation` |

UI support is present in `packages/storefront` and `packages/admin`; API routes are in `reservation.routes.ts` and nested table routes in `location.routes.ts`.

## Business rules

| Rule | Source | Preconditions | Expected outcome and observable side effect | Status |
|---|---|---|---|---|
| M1-BR-01 Party size is an integer from 1 through 50 | `reservation.controller.ts:6`; WF-RES-CUSTOMER | Valid request shape | Values 1 and 50 may reach persistence; 0 and 51 return 400 and perform no write | Enforced by Zod |
| M1-BR-02 Reservation creation requires a customer principal and an active location | `reservation.controller.ts:33`, `reservation.controller.ts:46`; WF-RES-CUSTOMER | Valid booking body | Missing principal returns 401; staff principal or inactive/missing location returns 400; no rejected request writes | Enforced |
| M1-BR-03 A partial update changes only supplied fields, including explicit null for `tableId` and `comment` | `reservation.controller.ts:14`, `reservation.controller.ts:153`; WF-RES-STAFF | Existing reservation | Prisma update payload contains supplied fields only | Enforced |
| M1-BR-04 A slot is available iff at least one active, sufficiently large table is not assigned to a non-cancelled reservation at that time | `reservation.controller.ts:380`, `reservation.controller.ts:390`, `reservation.controller.ts:406`; WF-RES-CUSTOMER | Location and date supplied | Returns 22 half-hour slots from 11:00 through 21:30 and eligible table count | Enforced by availability endpoint |

## Verified requirement gaps

The feature/API docs additionally promise past-date rejection, conflict rejection during creation, assignment capacity checking, and status lifecycle enforcement. `createReservation` only validates format, party-size range, customer type, and active location before writing. `updateReservation` accepts every enum status from every existing status and does not validate a table's location, capacity, active state, or conflicting assignment. These are observed implementation gaps requiring team confirmation and regression/fix work; they are not silently redefined as requirements.

The availability API documentation describes a single requested time and an `{available, tables}` response, while the implementation ignores the `time` query and returns 22 `{time, available}` slots plus `totalTables`.

## MCC and MC/DC

For M1-BR-02 location validity, decision `D = location exists AND location.isActive` is implemented as rejection `!location || !location.isActive` with JavaScript short-circuiting.

| Case | Exists A | Active B | B evaluated | Reject | Test |
|---|---:|---:|---:|---:|---|
| MCC-01 | F | N/A | No | T | inactive/missing parameter row (`null`) |
| MCC-02 | T | F | Yes | T | inactive/missing parameter row (`isActive:false`) |
| MCC-03 | T | T | Yes | F | party-size accepted boundary cases |

`A` independence: MCC-01 vs MCC-03, with the active property constrained/unreachable when no object exists. `B` independence: MCC-02 vs MCC-03. The masked `B` in MCC-01 is not evaluated; MC/DC uses the feasible short-circuit interpretation.

For table rename `D = name supplied AND name differs`, feasible rows are omitted name (F, masked), unchanged name (T,F), and changed name (T,T). The first two are implemented in the suite; changed-name duplicate/non-duplicate rows remain part of the coverage gap.
