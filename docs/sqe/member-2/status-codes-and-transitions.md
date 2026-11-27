# HTTP status and lifecycle test basis

> **Current review-branch update, 27 November 2026:** The historical observations below remain preserved. The user reported team approval of lifecycle, occupancy, availability and optional retry rules. Local candidate verification and remaining persistence/retention, integration and hosted-CI review are tracked in [final contract decisions](final-contract-decisions.md), [defect analysis](defect-analysis-and-release.md), and [report addendum](final-report-addendum.md). Do not interpret the historical failure counts below as the latest run.

| Result | Actual scope and examples |
|---|---|
| 200 | Successful GET or PATCH; also incorrectly accepted invalid table assignments and status transitions. |
| 201 | Successful reservation/table creation; duplicate booking and impossible date/time currently also return 201. |
| 400 | Invalid Zod body, missing availability location/date, invalid or inactive create location, and past create date. |
| 401 | Missing or invalid token on protected routes. |
| 403 | Non-staff write/list, non-owner reservation read, or insufficient role for table management. |
| 404 | Unknown reservation or nested table/location in the handlers that perform existence checks. |
| 409 | Duplicate table name within a location. |
| No response before deadline | Unknown table assignment or invalid query may raise an unhandled async Prisma rejection; check the recorded probe result rather than assuming an HTTP 500. |

### Endpoint and principal matrix

Codes below apply to the selected routes, including observed off-contract outcomes. Customer owner checks and staff role checks have distinct outcomes. Dates and unknown foreign keys that timed out have no observed HTTP status.

| Endpoint | Principal | Success | Client errors and other observed outcomes |
|---|---|---|---|
| GET availability | Public | 200 daily slots | 400 missing location/date. Invalid date probe timed out. Guide also documents a time-specific 200 or unavailable 400 |
| POST reservations | Customer | 201 | 400 invalid body, location, past date or staff principal. 401 missing/invalid credentials |
| GET my-reservations | Authenticated, scoped to principal ID | 200 | 401 |
| GET reservations | Staff | 200 | 401, 403 customer. Invalid status/date probes timed out |
| GET reservation by ID | Owner or staff | 200 | 401, 403 non-owner, 404 unknown, 500 malformed percent encoding |
| PATCH reservation | Staff | 200 | 400 invalid body, 401, 403 customer, 404 unknown reservation. Unknown table probe timed out |
| GET location tables | Public | 200 | 404 unknown location |
| GET nested table | Public | 200 | 404 unknown or other-location table |
| POST location table | Manager or super admin | 201 | 400, 401, 403 customer or ordinary staff, 404 unknown location, 409 duplicate name |
| PATCH nested table | Manager or super admin | 200 | 400, 401, 403 customer or ordinary staff, 404 unknown or wrong-location ID, 409 duplicate rename |

Validation-error arrays require a code, path and message for each issue. String errors must be nonempty. Successful reservation responses include the location and nullable table association. Multi-filter pagination checks compare exact row IDs and field values.

| Source status | Documented allowed tests | Tested disallowed changes |
|---|---|---|
| PENDING | CONFIRMED, CANCELLED | SEATED, COMPLETED |
| CONFIRMED | SEATED, CANCELLED | PENDING, COMPLETED |
| SEATED | COMPLETED, CANCELLED | PENDING, CONFIRMED |
| COMPLETED | CANCELLED, under the literal 'from any status' wording | PENDING, CONFIRMED, SEATED |
| CANCELLED | None established | PENDING, CONFIRMED, SEATED, COMPLETED |

All seven allowed examples passed in `evidence/api-matrix-full.txt`; all 13 disallowed distinct transitions returned 200 and persisted the target status. The team should resolve whether cancellation after completion is actually intended. These tests do not assume same-state update semantics or invent a specific rejection status.
