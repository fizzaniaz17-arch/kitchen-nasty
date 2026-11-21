# Complete MCC and MC/DC — Four Business Rules

## M1-BR-01 Party-size validity

Decision: `D = N ∧ I ∧ L ∧ U`, where N = numeric, I = integer, L = `partySize >= 1`, and U = `partySize <= 50`. Zod evaluates the schema; the table records semantic feasibility. If N is false, I/L/U are not meaningful. If I is false, integer-only boundaries are not applicable.

| Row | N | I | L | U | D | Representative case |
|---|---:|---:|---:|---:|---:|---|
| P1 | F | — | — | — | F | string `"2"` |
| P2 | T | F | F | T | F | `0.5` |
| P3 | T | F | T | T | F | `2.5` |
| P4 | T | F | T | F | F | `50.5` |
| P5 | T | T | F | T | F | `0` |
| P6 | T | T | T | T | T | `1`, `2`, `49`, `50` |
| P7 | T | T | T | F | F | `51` |

MC/DC pairs: I uses P3/P6, L uses P5/P6, and U uses P6/P7. P1/P6 demonstrates type gating, but unique-cause independence for N is infeasible because I/L/U are undefined for a nonnumeric input. L and U cannot both be false for a numeric value because no number is simultaneously below 1 and above 50. This semantic model evaluates numeric bounds for fractional values independently of Zod's internal issue/evaluation order.

## M1-BR-02 Authorized creation at active location

Top-level acceptance is `D = C ∧ E ∧ A`, where C = customer principal, E = location exists, A = location active. E/A execute only after C passes; A is unavailable if E is false.

| Row | C | E | A | D | Observable result |
|---|---:|---:|---:|---:|---|
| R1 | F | — | — | F | 401 anonymous or 400 staff; no DB lookup/write |
| R2 | T | F | — | F | 400; no write |
| R3 | T | T | F | F | 400; no write |
| R4 | T | T | T | T | 201 and reservation write |

MC/DC pairs: C uses R1/R4 under feasible short-circuit interpretation; E uses R2/R4; A uses R3/R4. E and A are masked when C is false; A is masked when E is false.

## M1-BR-03 Partial-update field inclusion

There are six independent unary decisions, not one compound decision. For each field F, `include(F) = supplied(F)`. Complete MCC for every decision is therefore two rows.

| Field decision | Supplied | Included in Prisma payload | Test evidence |
|---|---:|---:|---|
| status | F | F | valid empty update |
| status | T | T | all-fields update |
| tableId | F | F | valid empty update |
| tableId | T | T, including `null` | explicit-null and all-fields updates |
| date | F | F | valid empty update |
| date | T | T as `Date` | all-fields update |
| time | F | F | valid empty update |
| time | T | T | all-fields update |
| partySize | F | F | valid empty update |
| partySize | T | T | all-fields update |
| comment | F | F | valid empty update |
| comment | T | T, including `null` | explicit-null and all-fields updates |

Each field's false/true row is its MC/DC independence pair because no other condition participates in that field's decision. The empty update and all-fields update hold all other field decisions consistently at omitted/supplied extremes; focused null tests establish null is supplied rather than omitted.

## M1-BR-04 Availability conflict decision

For an existing reservation to reserve a table in a generated slot: `R = T ∧ Q`, where T = reservation time equals slot time and Q = tableId is truthy. Slot availability is `D = eligibleTablesAfterExclusion > 0`.

| Row | T | Q | Added to reserved IDs | Effect on availability |
|---|---:|---:|---:|---|
| R1 | F | F | F | none |
| R2 | F | T | F (short-circuit at T) | none |
| R3 | T | F | F | unassigned reservation does not consume table |
| R4 | T | T | T | matching table excluded |

MC/DC pairs for R: T uses R2/R4; Q uses R3/R4. Q is masked in R1/R2 when T is false by JavaScript `&&`. For final availability, a two-row independence pair is zero remaining eligible tables (false) versus one remaining eligible table (true); the tests exercise both at 11:00 and 11:30. Eligibility itself is delegated to Prisma with all three required predicates asserted: matching location, `isActive: true`, and `capacity.gte: partySize`.

## Coverage result

`npm run coverage:member1` executed 56 tests in two files on 21 November 2026. Result: 191/191 statements (100%), 99/99 branches (100%), 23/23 functions (100%), and 178/178 lines (100%) for `reservation.controller.ts` and `table.controller.ts`. There is no uncovered code in the declared denominator. The browser-rendered coverage evidence is `screenshots/coverage-overview.png`; the generated V8 summary and LCOV are in `packages/server/coverage/member-1/`.
