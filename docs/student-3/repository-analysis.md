# Student 3 Repository Analysis

## Scope and snapshot

This analysis is based on the local checkout of KitchenAsty at:

- Branch: `feature/student-3-ui-security-performance`
- Commit: `d6af7237e9569ebeab19ccab375362f9d144e25e`
- Commit: `chore: release 0.3.2 (#63)`
- Application version: `0.3.2` (`package.json`)

The selected scope is the Reservations and Table Management module. The
Student 3 work will add isolated testing, evidence, documentation, and the
assigned accessibility remediation. It will not add unsupported product
features.

## Architecture

KitchenAsty is an npm-workspaces TypeScript monorepo:

- `packages/server`: Express REST API, Prisma client, JWT authentication,
  Zod validation, Socket.IO/event integrations, Vitest and Supertest tests.
- `packages/admin`: React 18/Vite administrative application on port `5173`.
- `packages/storefront`: React 18/Vite customer application on port `5174`.
- `packages/shared`: shared TypeScript package.
- `packages/docs`: VitePress documentation.
- `prisma`: PostgreSQL schema, migrations, and seed script.
- `e2e`: Playwright tests split into `admin` and `storefront` suites.

The root scripts provide development servers, build, lint, unit/integration
tests, and Playwright E2E execution. `playwright.config.ts` starts the API,
admin, and storefront development servers and uses separate projects for the
two frontends.

## Reservation and table data model

`prisma/schema.prisma` defines:

- `Customer`: owns zero or more reservations.
- `Location`: owns tables and reservations.
- `Table`: belongs to a location and has a name, capacity, active flag, and
  reservations.
- `Reservation`: belongs to one customer and location, optionally references
  one table, and stores date, time, party size, comment, timestamps, and
  status.
- `ReservationStatus`: `PENDING`, `CONFIRMED`, `SEATED`, `COMPLETED`, and
  `CANCELLED`.

The reservation identifier is a CUID primary key. There is no database
constraint shown that prevents two reservations from using the same
date/time/table; availability is checked by application logic.

The seed creates one location (`downtown`), ten tables (`Table 1` through
`Table 10`), a seeded staff account, and a seeded customer account. These
credentials are development fixtures only and must not be used against a
public environment.

## Actual API routes

The reservation router is mounted at `/api/reservations`:

| Method and route | Access | Observed behavior |
|---|---|---|
| `GET /availability` | Public | Returns generated 30-minute slots from 11:00 through 21:30 for active tables that fit the requested party size. Existing non-cancelled reservations are considered when a table is assigned. |
| `GET /my-reservations` | Authenticated | Lists only the authenticated customer's reservations. |
| `GET /analytics` | Staff | Returns reservation analytics; route ordering places this before `/:id`. |
| `POST /` | Authenticated customer | Validates location/date/time/party size and creates a reservation owned by the customer principal. Staff tokens are rejected. |
| `GET /` | Staff | Returns a paginated, filterable reservation list. |
| `GET /:id` | Authenticated | Staff may read any reservation; a customer may read only a reservation whose `customerId` matches the token. |
| `PATCH /:id` | Staff | Updates status, table, date, time, party size, or comment. |
| `DELETE /:id` | Staff | Deletes a reservation. |

Table routes are nested under `/api/locations/:locationId/tables`:

- `GET /` and `GET /:tableId` are public reads.
- `POST /` and `PATCH /:tableId` require authenticated `SUPER_ADMIN` or
  `MANAGER`.
- `DELETE /:tableId` requires authenticated `SUPER_ADMIN` and refuses to
  delete a table with existing reservations.

The server mounts these routes in
`packages/server/src/app.ts`. The implementation files are
`packages/server/src/routes/reservation.routes.ts`,
`packages/server/src/controllers/reservation.controller.ts`,
`packages/server/src/routes/location.routes.ts`, and
`packages/server/src/controllers/table.controller.ts`.

## Actual customer workflow

The storefront route is `/reservations`
(`packages/storefront/src/main.tsx` and `pages/Reservations.tsx`):

1. The page loads active locations from `GET /api/locations`.
2. The customer selects a location and date, and chooses a party size.
3. The page calls `GET /api/reservations/availability`.
4. The customer selects an available generated time slot and may enter a
   comment.
5. A logged-in customer submits `POST /api/reservations`.
6. On success, the page displays `Reservation created!`, clears the selected
   time/comment, and reloads the customer's list through
   `GET /api/reservations/my-reservations`.
7. An unauthenticated visitor sees a login prompt and cannot submit.

The UI does not expose a customer reservation-detail route; the customer list
shows the reservation's date/time, location, party size, status, comment, and
assigned table when present.

## Actual admin/staff workflow

The admin routes are defined in `packages/admin/src/main.tsx`:

1. Staff authenticates through `POST /api/auth/staff/login`.
2. The admin app stores the JWT and loads the protected layout.
3. `/reservations` calls `GET /api/reservations` and displays filters, records,
   status actions, and a details link.
4. `/reservations/:id` calls `GET /api/reservations/:id`, then loads tables for
   the reservation's location.
5. The detail page can call `PATCH /api/reservations/:id` to set any enum
   status or assign/unassign a table.
6. Table administration is under `/locations/:locationId/tables`, where
   managers and super admins can create/update tables and super admins can
   delete them.

The list UI presents the intended status progression
`PENDING -> CONFIRMED -> SEATED -> COMPLETED` plus cancellation actions, but
the current API schema accepts any enum value for an update and does not
enforce transition ordering. This is a testing observation, not an
assumption that a defect has been established.

## Roles, authentication, and authorization

JWT payloads distinguish `type: 'staff'` from `type: 'customer'`.
Staff roles are `SUPER_ADMIN`, `MANAGER`, and `STAFF`.

Observed reservation permissions:

- Unauthenticated users: may check availability and read public location/table
  data; protected reservation operations require authentication.
- Customers: may create reservations, list their own reservations, and read
  their own reservation by ID; they cannot list all reservations, update, or
  delete reservations.
- Staff: may list, read, update, and delete reservations.
- Table creation/update: `SUPER_ADMIN` and `MANAGER`.
- Table deletion: `SUPER_ADMIN` only.
- Staff tokens cannot create customer-owned reservations.

`getReservation` contains an object-level ownership check and returns `403`
without reservation data for another customer. The repository includes
`reservation-idor.regression.test.ts`, which documents the prior advisory and
tests owner, other-customer, staff, missing-authentication, and malformed
principal cases. Student 3 will independently execute and report the
authorized local result rather than treating the test file alone as runtime
evidence.

## Existing testing infrastructure

Existing relevant coverage includes:

- Playwright storefront reservation smoke tests in
  `e2e/storefront/reservations.spec.ts`.
- Playwright admin reservation tests in
  `e2e/admin/reservations.spec.ts`.
- Admin authentication fixture in `e2e/admin/fixtures.ts`.
- Vitest/Supertest reservation API tests in
  `packages/server/src/__tests__/integration/reservation.test.ts`.
- IDOR regression tests in
  `packages/server/src/__tests__/integration/reservation-idor.regression.test.ts`.
- Table authorization and CRUD tests in
  `packages/server/src/__tests__/integration/table.test.ts`.

The Playwright configuration uses `trace: 'on-first-retry'`, a 30-second test
timeout, and starts all three local services. Student 3 tests will use a
separate `e2e/student-3/` directory and the existing configuration patterns.

## Environment and setup

Verified local tool versions:

- Node.js `v22.23.0`
- npm `10.9.8`
- Docker `29.8.2`

Repository prerequisites are Node.js 22+, npm 10+, and Docker-backed
PostgreSQL 16. The documented setup is:

1. `npm install`
2. Copy `packages/server/.env.example` to `packages/server/.env`.
3. Set a locally generated non-placeholder `JWT_SECRET`.
4. Start PostgreSQL with `docker compose up -d` or use the documented
   development workflow.
5. Run the Prisma migration and seed commands.
6. Start the server on `http://localhost:3000`, admin on
   `http://localhost:5173`, and storefront on `http://localhost:5174`.

The server refuses known placeholder JWT secrets. No environment file or
credential has been added to the repository.

## Potential risks and missing information

1. A local PostgreSQL instance and Docker daemon are required for live
   integration/E2E execution; database availability has not yet been
   validated.
2. Existing Playwright fixtures use the seeded admin account. Student 3 must
   create isolated synthetic customer accounts and avoid uncontrolled writes.
3. The current storefront reservation labels are visually associated but do not
   visibly use `htmlFor`/matching `id` attributes in the inspected component.
   This is a candidate for the required accessibility fix and must be
   confirmed with axe/Lighthouse before changing it.
4. The reservation update API accepts all enum statuses without transition
   validation, while the list UI suggests a sequential workflow. This needs
   an evidence-based test and should not be changed as part of testing unless
   separately approved.
5. Availability only excludes tables when existing reservations have a
   `tableId`; newly created reservations start unassigned. Concurrent booking
   behavior therefore needs careful measurement and safe cleanup.
6. Lighthouse, axe-core, k6, and OWASP ZAP availability still needs to be
   checked locally. Missing tools will be recorded as blocked, not passed.
7. The public live demo and its credentials are out of scope. All security,
   performance, and recovery testing must target a local authorized instance.

## Phase 0 conclusion

The repository is accessible and the reservation module is implemented with
customer creation, staff management, table assignment, role checks, and
existing regression coverage. The next step is controlled environment setup
and targeted execution of the existing reservation/API checks before adding
Student 3-specific automation or remediation.

## Phase 0 validation record

- `npm install` completed successfully on Node.js `22.23.0` and npm
  `10.9.8`. npm reported 89 vulnerabilities (7 low, 30 moderate, 47 high,
  5 critical); this is an observation for the later dependency-audit phase,
  not an automatic remediation.
- The existing reservation, IDOR regression, and table integration suites
  passed: 3 files and 52 tests passed using Vitest.
- Docker CLI is installed (`29.8.2`), but Docker Desktop's Linux engine was
  unavailable (`docker compose up -d postgres` could not connect to
  `dockerDesktopLinuxEngine`). Live PostgreSQL migration, seed, server,
  browser, performance, and recovery execution are therefore blocked until
  the local Docker engine is running.

## Live setup validation

- Docker Desktop was started successfully and the Docker engine reported
  server version `29.8.2`.
- PostgreSQL 16 became healthy through Docker Compose on port `5432`.
- Prisma migrations were applied successfully and the database is in sync
  with the current schema.
- The database seed completed successfully and created local development
  fixtures.
- The API responded successfully at `http://localhost:3000/api/health`.
- The locations endpoint responded successfully and returned one seeded
  location.
- The admin application responded successfully at `http://localhost:5173`.
- The storefront reservation route responded successfully at
  `http://localhost:5174/reservations`.
- Playwright Chromium was installed because it was absent.
- The existing storefront/admin reservation specs passed: 15/15 tests.

## Current database reactivation

- The Docker Desktop Linux engine is reachable through the `desktop-linux`
  context (server version `29.8.2`), even though the Windows
  `com.docker.service` service reports `Stopped`.
- The existing `kitchenasty-db` PostgreSQL 16 container was started without
  recreating or deleting its `kitchenasty_pgdata` volume. Its health check is
  passing, and host port `5432` accepts connections.
- The ignored local `.env` now includes the Compose-compatible
  `DATABASE_URL=postgresql://kitchenasty:kitchenasty@localhost:5432/kitchenasty`.
  The existing JWT secret was preserved and not printed.
- Prisma reports all seven migrations applied and the schema up to date.
- Existing seed data was verified (1 user, 1 customer, 1 location, 10 tables,
  1 reservation, 15 orders, and 2 delivery zones). The seed script was not
  rerun because it contains non-idempotent creates and would duplicate data.
- Only PostgreSQL was started for this setup task; the API, admin, and
  storefront containers remain stopped.
