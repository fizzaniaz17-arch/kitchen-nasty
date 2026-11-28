# Team Test Plan: KitchenAsty Reservations

**Module Scope:** Reservations & Table Management  
**Team Repository:** https://github.com/fizzaniaz17-arch/kitchen-nasty  
**Upstream Reference:** https://github.com/mighty840/kitchenasty (License: MIT, Baseline: `d6af7237e9569ebeab19ccab375362f9d144e25e` - `release 0.3.2 (#63)`)  
**Shared Record:** Reservation ID (`id`) linked across Customer and Staff roles.  
**Database:** PostgreSQL 16 (isolated loopback port `55432` for test automation).

---

## 1. System Scope & Two Linked Workflows

The SQE project focuses exclusively on the **Reservations** subsystem connecting customer-facing self-service booking with back-office staff floor and table assignment:

1. **Workflow 1: Customer Reservation Lifecycle (`WF-RES-CUSTOMER`)**
   - **Actor:** Authenticated Customer.
   - **Operations:**
     - Query real-time table availability for location, date, time, and party size (`GET /api/reservations/availability`).
     - Create a booking with party size, contact comment, and requested schedule (`POST /api/reservations`).
     - View own bookings (`GET /api/reservations/my-reservations`).
   - **Expected Outcome:** Persistent reservation record created in `PENDING` state; double-booking rejected; party size bounded within 1–50.

2. **Workflow 2: Staff Table Assignment & Lifecycle Advancement (`WF-RES-STAFF`)**
   - **Actor:** Authenticated Staff / Manager.
   - **Operations:**
     - List reservations filtered by status, date, and location (`GET /api/reservations`).
     - Inspect details of a specific reservation ID (`GET /api/reservations/:id`).
     - Assign an active table belonging to the same location with sufficient capacity (`PATCH /api/reservations/:id`).
     - Transition reservation status (`PENDING` -> `CONFIRMED` -> `SEATED` -> `COMPLETED`, or `CANCELLED`).
   - **Expected Outcome:** Table association updated without table-sharing conflicts; status advances strictly according to authorized lifecycle transitions.

### Functional Requirements Matrix (>= 8 Requirements)

| Requirement ID | Workflow | Description | Validation Level | Owner |
|---|---|---|---|---|
| **REQ-RES-01** | Customer | System shall reject past dates with HTTP 400 (`Cannot reserve in the past`). | Unit, Integration | Member 1 |
| **REQ-RES-02** | Customer | System shall enforce party size between 1 and 50 inclusive; 0 and 51 return HTTP 400. | Unit, EP/BVA, API | Member 1, Member 2 |
| **REQ-RES-03** | Customer | Customer creation requires authenticated customer token and active location. | Unit, API, E2E | Member 1, Member 2 |
| **REQ-RES-04** | Customer | Querying availability returns accurate half-hour slots for active, non-conflicting tables. | Unit, API, E2E | Member 1, Member 2 |
| **REQ-RES-05** | Staff | Staff can query reservations filtered by date, status, and location. | API, E2E | Member 2 |
| **REQ-RES-06** | Staff | Staff can assign an eligible table (active, matching location, capacity >= party size). | Unit, API, E2E | Member 1, Member 2 |
| **REQ-RES-07** | Staff | System shall prevent assigning one table to multiple overlapping reservations. | API, Integration | Member 2 |
| **REQ-RES-08** | Staff | Reservation status transitions must follow the valid lifecycle sequence. | Unit, API | Member 1, Member 2 |

### Core Business Rules (4 Minimum)

1. **M1-BR-01 (Boundary):** Reservation party size must be an integer between 1 and 50 inclusive.
2. **M1-BR-02 (Multi-condition decision):** Location must exist AND be marked active (`location && location.isActive`).
3. **M1-BR-03 (State/Data change):** Partial reservation update updates only supplied fields, supporting explicit `null` table unassignment.
4. **M1-BR-04 (Boundary/Slot calculation):** Availability calculation iterates across 22 operational half-hour slots (11:00 to 21:30), asserting eligible unreserved table capacity.

---

## 2. Testing Strategy, Levels & Ownership

| Test Level | Scope | Tools & Frameworks | Owner |
|---|---|---|---|
| **White-Box Unit & Mutation** | Controller unit tests, Statement/Branch coverage, MCC/MC/DC, Stryker mutation analysis, manual CFG / cyclomatic complexity. | Vitest, `@vitest/coverage-v8`, `@stryker-mutator/core` | **Member 1** |
| **API & Black-Box Specification** | 382 PostgreSQL API test suite, 296 generated EP/BVA test cases, generator validation, defect register, constraint shift demos. | Vitest, Node.js scripts, Docker PostgreSQL | **Member 2** |
| **System, Non-Functional & Security** | Browser E2E journeys (Playwright), accessibility (axe/Lighthouse), security headers (CSP/HSTS), dependency audit, PostgreSQL recovery. | Playwright, Nginx, k6, ZAP | **Member 3** |

---

## 3. Test Environment & Synthetic Test Data

- **Runtime:** Node.js 22 LTS (CI) / Node.js 24 (local development), TypeScript 5.x.
- **Database:** PostgreSQL 16 on `127.0.0.1:55432/kitchenasty_member2_test`.
- **Isolation:** Ephemeral secrets generated per run (`openssl rand -hex 32`); database migrated fresh via Prisma migrations.
- **Identities:** Synthetic deterministic test personas (`customer-m1`, `manager-m1`, synthetic Bearer tokens).
- **Mocking:** Vitest mocks for controller isolation; Playwright network route interception for frontend browser flows.

---

## 4. Effort Estimation vs. Actuals (PERT / Three-Point Estimation)

Formula: **Expected Effort $E = \frac{O + 4M + P}{6}$**

| Activity | Owner | Optimistic (O) | Most Likely (M) | Pessimistic (P) | PERT Expected (E) | Actual Effort | Variance / Status |
|---|---|---:|---:|---:|---:|---|---|
| Static Analysis & Sonar Setup | Member 1 | 8 hrs | 14 hrs | 24 hrs | 14.7 hrs | *Not recorded contemporaneously* | **Pending member confirmation** |
| White-box & Mutation Suite | Member 1 | 16 hrs | 24 hrs | 40 hrs | 25.3 hrs | *Not recorded contemporaneously* | **Pending member confirmation** |
| EP/BVA Generator & API Testing | Member 2 | 20 hrs | 32 hrs | 50 hrs | 33.0 hrs | *Not recorded contemporaneously* | **Pending member confirmation** |
| Playwright E2E & Browser Flows | All Members | 12 hrs | 20 hrs | 36 hrs | 21.3 hrs | *Not recorded contemporaneously* | **Pending member confirmation** |
| Security, Audit & Recovery | Member 3 | 14 hrs | 22 hrs | 38 hrs | 23.3 hrs | *Not recorded contemporaneously* | **Pending member confirmation** |
| Test Management & Final Report | Shared | 10 hrs | 16 hrs | 28 hrs | 17.0 hrs | *Not recorded contemporaneously* | **Pending member confirmation** |

> *Note on Academic Rigor:* Per project instructions, actual student effort hours were not tracked in a contemporaneous clocking tool during execution. The team declares them as **Pending member confirmation** rather than inventing artificial retrospective numbers.

---

## 5. Entry, Exit, Suspension & Resumption Criteria

### Entry Criteria
1. Upstream code baseline frozen at commit `d6af7237e9569ebeab19ccab375362f9d144e25e`.
2. Database schema deployed and Prisma client generated without compilation errors.
3. Node and npm dependencies installed cleanly via `npm ci --ignore-scripts`.

### Suspension Criteria
1. Critical database migration failure preventing table creation.
2. Hosted runner failure in GitHub Actions (e.g., toolchain binary missing on runner OS).
3. Persistent blocking credentials or license denial on SonarCloud API.

### Resumption Criteria
1. Fix applied via isolated pull request and verified through local replication scripts.
2. Database reset to known clean migration state.
3. Toolchain dependencies aligned with containerized configurations.

### Exit Criteria
- See dedicated [Group Exit Criteria and Risk Register](risk-matrix-and-exit-criteria.md).
