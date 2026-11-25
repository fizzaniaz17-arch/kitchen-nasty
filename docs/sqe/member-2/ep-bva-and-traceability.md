# EP, BVA and traceability

Working source: `tests/team/member-2/reservations.openapi.json`; emitted case IDs and values: `tests/team/member-2/generated/ep-bva-cases.json`. The rows below describe test categories, not a claim that all business rules pass. Query parameters travel as text; the query literal `null` is not a JSON null. Path IDs cannot be JSON null at the HTTP path layer. Domain rules that relate multiple records are represented by separate fixtures and tests.

| Input and endpoints | Classes and boundaries exercised | Requirement / evidence |
|---|---|---|
| Create locationId | missing, null, number, boolean, object, length 0/1/2, active/inactive/unknown | M1-BR-02; generated body and business cases |
| Reservation date on create/update | omitted where optional, missing where required, null, wrong types, format match/mismatch; create yesterday/today/tomorrow under a controlled UTC clock from generated minimum-day metadata; impossible date | WF-RES-CUSTOMER; date regression cases |
| Reservation time on create/update | omitted/missing/null, wrong types, matching/nonmatching format; `-1:59`, `00:00`, `00:01`, `23:58`, `23:59`, `24:00`, `99:99`, `19:99` | WF-RES-CUSTOMER; generated business examples distinguish clock validity from the regex; out-of-range values currently persist |
| partySize on create/update | missing/omitted/null, string/boolean/object/fraction, `0,1,2` and `49,50,51` | M1-BR-01; generated cases and DB count/state |
| comment on create/update | omitted, null, wrong types, empty, ordinary, whitespace and long text | M1-BR-03; update supports explicit null, create does not |
| status on update | omitted/null/wrong type, each enum, invalid enum; documented transitions | lifecycle matrix in `status-codes-and-transitions.md`; requirement failures retained |
| tableId on update | omitted/null/wrong type, schema-valid IDs, eligible, missing, inactive, other-location, too-small, conflicting | WF-RES-STAFF and defects; one case isolates each business rule |
| Table name on create/update | missing/omitted/null/wrong types, lengths `0,1,2`, duplicate and duplicate rename | Table rule; names are unique within a location; whitespace-only name behavior not independently verified |
| Table capacity create/update | missing/omitted/null, wrong types/fraction, `0,1,2` | Table rule; no maximum exists in schema, so none is invented |
| Table isActive create/update | missing/omitted/null, booleans, string/number/object | Table rule; separate inactive-table test |
| Reservation/table path IDs | known and unknown IDs per operation | Encoded known ID and malformed escape exercised on reservation GET. Nested table location mismatch is covered separately |
| Availability query location/date | missing/empty/ordinary/null literal/unknown ID or malformed date as applicable | Generated query cases; bad date uses child process to capture an unhandled rejection |
| Availability query time | Omitted, empty, null text, malformed 24:00, occupied 19:00 and free 19:30 | API guide; daily slots returned for all six. See M2-D09 |
| Whole reservation create body | Empty object; valid fields plus unrecognized status | Generated object cases; structured field errors and zero writes, or default PENDING persisted |
| Availability query partySize | missing/empty/ordinary/null literal, 0/1/2 and 49/50/51, negative, decimal, text | Generated query cases: `parseInt(...) || 2` is current behavior, not a 1..50 schema enforcement |
| List page/limit | omitted/empty/ordinary/null literal, negative, decimal, text; page `0,1,2`, limit `0,1,2` and `49,50,51` | Both list endpoints; parsed/clamped values asserted, 51 clamps to 50 |
| Staff list status/location/date | omitted/empty/ordinary/null literal; status enums/invalid; location unknown; malformed date | Generated cases and isolated invalid-query probes; three simultaneous filters with nonmatching rows and paginated matching IDs |
| Authentication/roles | no token, invalid token, owner, non-owner, customer, staff, manager and super-admin; table create/update role matrix | Endpoint roles and response codes in status-codes-and-transitions.md |

Cross-workflow trace: create as customer (`201`) -> PATCH same ID as staff -> read same ID through HTTP and Prisma -> rejected customer PATCH -> compare stored row. Repeated create, undersized/conflicting/inactive/wrong-location table assignment, lifecycle violations, and impossible date/time cases each have separate assertions and observed evidence. User-confirmed lifecycle test basis: `packages/docs/features/reservations.md`; earlier four business rules: `docs/sqe/member-1/test-basis.md`.

The generated IDs verify consumption of these identified partitions. Multi-record rules use explicit fixtures. Extreme encodings, timezone policy and concurrency are outside this targeted pass. See the defect register for risk mappings and the status report for shared rubric obligations.
