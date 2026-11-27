# Student 3 Recovery Report

## Scope

Proposed controlled recovery scenario: stop the local PostgreSQL container,
verify a database-backed reservation read fails safely, restart PostgreSQL,
and verify API recovery and persistence of a synthetic reservation.

## Results

**Not run yet.** The recovery interruption must be performed in the local
test database only and will be reported after the controlled failure,
restoration, and data-integrity checks execute. No recovery time or data
integrity result is claimed at this stage.

## Safety

The database container is the local Compose service `postgres` with a
dedicated `kitchenasty_pgdata` volume. Do not apply this procedure to any
production or shared database.
