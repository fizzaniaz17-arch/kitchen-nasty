# Reservation and table defect register

The final PostgreSQL run failed 36 requirements. The 33 original failures reproduced by exact full Vitest name. The rows below use local triage IDs. The team repository?s issue list contained PRs only when checked. No corresponding GitHub issue number or owner acceptance has been established. These local records can serve as issue drafts.

| ID | Reproduction and expected result | Observed behavior and candidate cause | Severity / priority | Risk |
|---|---|---|---|---|
| M2-D01 | Submit the same authenticated reservation create twice. The assignment expects one booking for a retry | Two 201 responses and two distinct stored IDs. Create inserts per call. The team needs a way to distinguish a retry from two intended bookings | High / high | R-P01 |
| M2-D02 | Assign a capacity-1 table to a party of four. Expect a client error and original reservation | 200 and undersized table ID persisted. Candidate cause is missing capacity validation on staff update | High / high | R-P03 |
| M2-D03 | Assign one table to two bookings at the same location, date and time. Expect rejection of the second assignment | 200 with a second assignment persisted. Candidate cause is missing slot-conflict validation | High / high | R-P01 |
| M2-D04 | Seed the source state and PATCH each disallowed target in the lifecycle matrix. Expect a 4xx and the original state | 13 responses were 200 and stored the requested target. The update accepts enum members without a transition check. The seven documented forward/cancellation transitions passed. Cancellation after completion follows the literal guide pending team clarification | High / high | R-P02 |
| M2-D05 | PATCH with an inactive or another location?s table. Expect a 4xx and the original association | Both returned 200 and stored the table ID. Candidate cause is missing location/active-state checks | High / high | R-P03 |
| M2-D06 | PATCH a fresh reservation with an unknown table ID. Expect a controlled 4xx and unchanged row | Local child process recorded a foreign-key rejection and no HTTP response before 1.5 s. Candidate cause is an uncaught async Prisma rejection | Medium / high | R-P03 |
| M2-D07 | Create/PATCH each impossible date or clock value. Expect semantic validation, a 4xx and zero mutation | Eight accepted writes. Date normalized to March 2 or the literal invalid time persisted. Validation checks shape without validating calendar/clock ranges | Medium / high | M2-R01 |
| M2-D08 | Query availability or staff list with malformed date, or staff list with invalid status. Expect a controlled 4xx | Six isolated requests observed Prisma rejections and no HTTP response within 1.5 s. The persisted fixture was unchanged. Candidate cause is unvalidated filters and unhandled promise rejection | Medium / high | M2-R02 |
| M2-D09 | With one eligible table booked at 19:00, request 19:00 and then free 19:30. Guide says unavailable 400 or 200 with available/tables for the requested time | Both returned 200 with all 22 slots and totalTables. The handler never reads time. The guide/controller disagreement is confirmed. The authoritative public shape needs team agreement | Medium / high | R-P05 |
| M2-D10 | Send authenticated GET for a reservation with an invalid percent escape. Expect a client error and unchanged fixture | 500 JSON with a decode error. The generic Express error handler assigns status 500. Encoded valid IDs resolved correctly | Medium / normal | M2-R02 |

R-P01, R-P02, R-P03 and R-P05 refer to the [team risk register](../member-1/risk-and-exit.md). M2-R01 (invalid persisted booking dates/times) and M2-R02 (malformed input produces a server error or a hanging request) are proposed additions for team review. No matching shared IDs were identified. The timeout is a local observation under an explicit deadline. Production timeout duration and server restart behavior remain unverified.

### Test-level evidence

Use the [reproduction commands](status.md) to run the whole suite. With the same test database and setup, append Vitest?s `-t` option with a distinctive fragment of a title to select a narrow repro. Each evidence link points to that case?s observation in the final unedited log. The [JSON report](evidence/audit-final-results.json) records the corresponding assertions. The expected behavior and suspected cause are grouped above by defect ID.

| Defect | Exact test title | HTTP and persisted result |
|---|---|---|
| M2-D07 | `post:/reservations:business:date:impossible-calendar-date` | [HTTP 201, 1 row, stored 2099-03-02T00:00:00.000Z](evidence/audit-final-full.txt#L43) |
| M2-D07 | `post:/reservations:business:time:clock-above-max` | [HTTP 201, 1 row, stored 24:00](evidence/audit-final-full.txt#L70) |
| M2-D07 | `post:/reservations:business:time:invalid-hour-minute` | [HTTP 201, 1 row, stored 99:99](evidence/audit-final-full.txt#L73) |
| M2-D07 | `post:/reservations:business:time:invalid-minute` | [HTTP 201, 1 row, stored 19:99](evidence/audit-final-full.txt#L76) |
| M2-D07 | `patch:/reservations/{id}:business:date:impossible-calendar-date` | [HTTP 200, 1 row, stored 2099-03-02T00:00:00.000Z](evidence/audit-final-full.txt#L88) |
| M2-D07 | `patch:/reservations/{id}:business:time:clock-above-max` | [HTTP 200, 1 row, stored 24:00](evidence/audit-final-full.txt#L114) |
| M2-D07 | `patch:/reservations/{id}:business:time:invalid-hour-minute` | [HTTP 200, 1 row, stored 99:99](evidence/audit-final-full.txt#L117) |
| M2-D07 | `patch:/reservations/{id}:business:time:invalid-minute` | [HTTP 200, 1 row, stored 19:99](evidence/audit-final-full.txt#L120) |
| M2-D08 | `get:/reservations/availability:query:date:null-literal` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L151) |
| M2-D08 | `get:/reservations/availability:query:date:invalid-format` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L157) |
| M2-D08 | `get:/reservations:query:status:null-literal` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L202) |
| M2-D08 | `get:/reservations:query:status:invalid-enum` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L212) |
| M2-D08 | `get:/reservations:query:date:null-literal` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L226) |
| M2-D08 | `get:/reservations:query:date:invalid-format` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L229) |
| M2-D10 | `get:/reservations/{id}:path:id:malformed-escape` | [HTTP 500, Failed to decode param '%ZZ', reservation unchanged](evidence/audit-final-full.txt#L264) |
| M2-D09 | `get:/reservations/availability:query:time:ordinary` | [HTTP 200, 22 daily slots, one eligible table, reservation unchanged](evidence/audit-final-full.txt#L280) |
| M2-D09 | `get:/reservations/availability:query:time:free-slot` | [HTTP 200, 22 daily slots, one eligible table, reservation unchanged](evidence/audit-final-full.txt#L289) |
| M2-D04 | `rejects PENDING to SEATED without changing the record` | [HTTP 200, stored SEATED](evidence/audit-final-full.txt#L493) |
| M2-D04 | `rejects PENDING to COMPLETED without changing the record` | [HTTP 200, stored COMPLETED](evidence/audit-final-full.txt#L496) |
| M2-D04 | `rejects CONFIRMED to PENDING without changing the record` | [HTTP 200, stored PENDING](evidence/audit-final-full.txt#L499) |
| M2-D04 | `rejects CONFIRMED to COMPLETED without changing the record` | [HTTP 200, stored COMPLETED](evidence/audit-final-full.txt#L511) |
| M2-D04 | `rejects SEATED to PENDING without changing the record` | [HTTP 200, stored PENDING](evidence/audit-final-full.txt#L514) |
| M2-D04 | `rejects SEATED to CONFIRMED without changing the record` | [HTTP 200, stored CONFIRMED](evidence/audit-final-full.txt#L517) |
| M2-D04 | `rejects COMPLETED to PENDING without changing the record` | [HTTP 200, stored PENDING](evidence/audit-final-full.txt#L529) |
| M2-D04 | `rejects COMPLETED to CONFIRMED without changing the record` | [HTTP 200, stored CONFIRMED](evidence/audit-final-full.txt#L532) |
| M2-D04 | `rejects COMPLETED to SEATED without changing the record` | [HTTP 200, stored SEATED](evidence/audit-final-full.txt#L535) |
| M2-D04 | `rejects CANCELLED to PENDING without changing the record` | [HTTP 200, stored PENDING](evidence/audit-final-full.txt#L544) |
| M2-D04 | `rejects CANCELLED to CONFIRMED without changing the record` | [HTTP 200, stored CONFIRMED](evidence/audit-final-full.txt#L547) |
| M2-D04 | `rejects CANCELLED to SEATED without changing the record` | [HTTP 200, stored SEATED](evidence/audit-final-full.txt#L559) |
| M2-D04 | `rejects CANCELLED to COMPLETED without changing the record` | [HTTP 200, stored COMPLETED](evidence/audit-final-full.txt#L562) |
| M2-D05 | `rejects assigning an inactive table without mutation` | [HTTP 200, requested table assignment persisted](evidence/audit-final-full.txt#L565) |
| M2-D05 | `rejects assigning an other-location table without mutation` | [HTTP 200, requested table assignment persisted](evidence/audit-final-full.txt#L577) |
| M2-D06 | `rejects assigning a nonexistent table without an unexpected server error` | [No HTTP response by 1.5 s, original reservation unchanged](evidence/audit-final-full.txt#L583) |
| M2-D01 | `does not create duplicate records for a repeated identical booking` | [HTTP [201, 201], 2 rows](evidence/audit-final-full.txt#L586) |
| M2-D02 | `rejects assigning an undersized table without changing the reservation` | [HTTP 200, requested table assignment persisted](evidence/audit-final-full.txt#L594) |
| M2-D03 | `rejects assigning a table already booked for the same slot` | [HTTP 200, requested table assignment persisted](evidence/audit-final-full.txt#L597) |
