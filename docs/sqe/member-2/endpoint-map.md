# Reservation API coverage map

Specification: `tests/team/member-2/reservations.openapi.json`; API prefix `/api`. Baseline: `6dbae760f9763740ff7f569eca3a981021c18e5d`. Body schema constraints describe actual Zod validation; related-record rules and lifecycle expectations are separate. A tested case may expose a defect; see `defects.md`.

| Endpoint | Inputs and actor | Current executable coverage | Remaining work |
|---|---|---|---|
| GET `/reservations/availability` | Public; `locationId`, `date`, `partySize`, `time` | Generated omission, empty, ordinary, malformed date, unknown ID, query bounds and parsing; occupied/free requested time against the API guide, omitted/empty/malformed time characterization, daily-slot response schema | Inactive locations and full eligible-table combinations |
| POST `/reservations` | Customer; location, date, time, size, optional comment | Generated empty/extra-property bodies and size triplets; generated UTC yesterday/today/tomorrow; auth, inactive/unknown/empty location; impossible dates and clock regression checks; database counts; duplicate regression | Additional timezone conventions require a business decision |
| GET `/reservations/my-reservations` | Authenticated; page, limit | Generated pagination values and clamp thresholds; own-record read | Cross-customer list and pagination checked; extreme page numbers untested |
| GET `/reservations/{id}` | Owner or staff; ID | Generated known/unknown, encoded known ID, malformed escape; staff, owner/non-owner and missing/invalid-token access; scoped response schema | More exhaustive staff location and response-field assertions |
| GET `/reservations` | Staff; page, limit, status, locationId, date | Generated queries and clamps; invalid enums/dates, unknown location, simultaneous status/location/date filters with decoys, two pages and an empty page, exact IDs, nested table and counts; denied customer; scoped response schema | Full staff location-access policy needs team clarification |
| PATCH `/reservations/{id}` | Staff; ID and optional status/table/date/time/size/comment | Generated body, business date/time and path cases; null/omitted; lifecycle; capacity, conflict, unknown, inactive and wrong-location table regressions; schema and unchanged-field assertions | Additional timezone/calendar partitions and concurrency behavior |
| GET `/locations/{locationId}/tables` | Public; location ID | Generated known/unknown path; public list | Table-list response contract and multiple locations |
| GET `/locations/{locationId}/tables/{tableId}` | Public; two path IDs | Generated known/unknown per ID, detail read, cross-location 404, scoped response schema | Additional malformed/encoded IDs |
| POST `/locations/{locationId}/tables` | Manager/super admin; location ID, name, capacity, active | Generated path and body cases, capacity triplet, duplicate, customer/staff denied and manager/super-admin allowed; scoped response schema | Inactive location semantics |
| PATCH `/locations/{locationId}/tables/{tableId}` | Manager/super admin; IDs, optional name/capacity/active | Generated path and body cases, duplicate rename, role matrix, cross-location rejection, scoped response schema, read-back | Additional malformed/encoded IDs |

`DELETE` and analytics are outside this scoped workflow map. Browser and shared team evidence remain separate obligations; do not present this table as a complete requirements traceability matrix.
