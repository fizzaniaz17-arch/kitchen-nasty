# Member 1 Browser Use Cases

## UC-M1-01 — Customer creates a reservation

- Actor: authenticated customer.
- Trigger: customer opens Table Reservations to book.
- Preconditions: synthetic customer token, active location, deterministic availability response.
- Test data: `customer-m1`, `loc-m1`, 2027-01-10, slot 19:00.
- Postcondition: successful POST state contains location, date, time, party size and optional comment; rejected flows leave the synthetic store empty.

| Flow | Steps and oracle | Playwright case |
|---|---|---|
| Main | Select location/date/available slot; submit; success appears and captured POST state matches | `UC-M1-01-MAIN` |
| Alternative 1 | Select party size 4 and comment; persisted state contains both | `UC-M1-01-ALT-01` |
| Alternative 2 | Availability marks slot false; slot is disabled | `UC-M1-01-ALT-02` |
| Exception 1 | Submit without location/date/time; validation message appears and no POST state exists | `UC-M1-01-EX-01` |
| Exception 2 | API returns 409; error appears and no state is stored | `UC-M1-01-EX-02` |

## UC-M1-02 — Staff assigns a table

- Actor: authenticated manager.
- Trigger: manager opens an existing reservation.
- Preconditions: synthetic reservation and two same-location tables.
- Test data: `reservation-m1`, `table-a`, `table-b`, `loc-m1`.
- Postcondition: accepted selection updates displayed assignment and route-backed readback; rejected selection leaves assignment unchanged.

| Flow | Steps and oracle | Playwright case |
|---|---|---|
| Main | Assign Table A; definition readback and stored state show Table A | `UC-M1-02-MAIN` |
| Alternative 1 | Assign Table B; definition readback and stored state show Table B | `UC-M1-02-ALT-01` |
| Alternative 2 | Assign then clear; UI returns to Unassigned and state is null | `UC-M1-02-ALT-02` |
| Exception 1 | API returns 409; error appears and state stays null | `UC-M1-02-EX-01` |
| Exception 2 | No tables returned; only Unassigned option exists and state stays null | `UC-M1-02-EX-02` |

Command: `npm run test:e2e:member1`. Actual result on 2026-11-21: 10 passed in 24.6 seconds using installed Chrome. Vite logged unrelated proxy refusals for dashboard/settings/legal endpoints not used by these route-isolated cases; all scoped case requests were intercepted deterministically.
