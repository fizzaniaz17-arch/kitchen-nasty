# Student 3 PostgreSQL Recovery Report

## Scope and safety

Recovery testing used a new, isolated PostgreSQL 16 container named
`student3-recovery-pg`, bound only to `127.0.0.1:55432`. It used database
`student3_recovery` and the separate named volume `student3-recovery-data`.
The existing `kitchenasty-db` container and its volume were not stopped,
modified, or used for test records. No project seed script, reset, or data
deletion was performed.

The Prisma schema models a reservation with required customer and location
relations and an optional table relation. The test data was synthetic and
used the `example.test` domain.

## Migration and baseline

All seven checked-in Prisma migrations were deployed successfully to the
isolated database. The test created one customer, one location, one table,
and one confirmed reservation:

| Record | Test value |
|---|---|
| Reservation ID | `student3-recovery-reservation-1` |
| Date and time | `2026-11-23 19:00` |
| Status and party size | `CONFIRMED`, 2 |
| Customer | `student3-recovery@example.test` |
| Location slug | `student3-recovery-test-location` |
| Table | `Recovery Test Table 1` |

The initial API check returned the seeded test location, and the reservation
was read with its customer, location, and table relations present.

## Database outage and recovery

With the API process left running, the isolated PostgreSQL container was
stopped. The first outage attempt exposed an unhandled rejected Prisma query in
`GET /api/locations`, which terminated that API process. The controller now
forwards the asynchronous error to the existing Express error handler, and an
integration regression test covers the failure path.

After the fix, the same request during database unavailability returned a
generic HTTP 500 response without database details; the API process continued
to respond to its liveness endpoint. That endpoint checks process liveness,
not database readiness, and returned HTTP 200 while PostgreSQL was unavailable.
After PostgreSQL restarted, `GET /api/locations` returned HTTP 200 without
restarting the API, and the original reservation was still present with its
relations intact.

## Data integrity and backup/restore

The reservation count by ID was one before the outage, after reconnection,
and after restore. A match on customer, location, table, date, and time also
returned one row. A deliberately invalid customer foreign-key probe was
rejected by Prisma/PostgreSQL with `P2003`, and no probe row was created.

A custom-format backup was created with `pg_dump`. It is stored as
[`student3-recovery.dump`](./recovery-evidence/student3-recovery.dump), with
SHA-256
`6A7371BAF4B1C0B24E6B45F53067B285AFABD37BA7B4881BEFE245EA101E505A`.
The archive was restored into the separate database
`student3_recovery_restore` using `pg_restore`. The source and restored
snapshots matched: one synthetic customer, location, table, and reservation;
all seven applied migrations; the same reservation fields; and all three
relations present.

## Results and limitations

- Migration deployment, outage handling after the fix, reconnection, backup,
  restore, foreign-key rejection, and integrity checks passed.
- The outage check covers the location-list route and its error-handling
  regression; it does not establish that every asynchronous controller
  handles database outages safely.
- `/api/health` is a liveness endpoint, not a database-readiness check.
- Only isolated synthetic data was used. No production recovery or restore
  was attempted.
- After testing, only `student3-recovery-pg` was stopped. Its named volume was
  retained; `kitchenasty-db` remained running.

## Evidence

Machine-readable responses, migration output, dump/restore logs, checksum, and
integrity results are preserved in
[`recovery-evidence/`](./recovery-evidence/):

The final cleanup capture confirms both isolated databases remain on the
preserved named volume, `student3-recovery-pg` is stopped, and the shared
`kitchenasty-db` container remains running.

- [`migration-deploy.txt`](./recovery-evidence/migration-deploy.txt) and
  [`migration-status.txt`](./recovery-evidence/migration-status.txt)
- [`reservation-before.json`](./recovery-evidence/reservation-before.json),
  [`service-before-outage.json`](./recovery-evidence/service-before-outage.json),
  and outage/restart response captures
- [`foreign-key-integrity.json`](./recovery-evidence/foreign-key-integrity.json)
- [`pg-dump.log`](./recovery-evidence/pg-dump.log),
  [`backup-checksum.json`](./recovery-evidence/backup-checksum.json), and
  [`pg-restore.log`](./recovery-evidence/pg-restore.log)
- [`restore-verification.json`](./recovery-evidence/restore-verification.json)
  and [`cleanup-status.json`](./recovery-evidence/cleanup-status.json)
