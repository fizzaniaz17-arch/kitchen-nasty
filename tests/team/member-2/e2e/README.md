# Member 2 browser use cases

Run from the repository root after installing the locked dependencies and generating the Prisma client. Docker must be running in Linux-container mode with the postgres:16-alpine image available. Use Chromium installed by Playwright, or select an installed Chrome with M2_BROWSER_CHANNEL=chrome. On Windows the following commands use Chrome:

~~~powershell
npm.cmd ci
npx.cmd -w packages/server prisma generate --schema ../../prisma/schema.prisma
$env:DOCKER_CONTEXT = 'desktop-linux'
$env:M2_BROWSER_CHANNEL = 'chrome'
node tests/team/member-2/e2e/run.mjs
~~~

The runner creates a unique, auto-removed container, backed by tmpfs, publishing only 127.0.0.1:55433. It generates fresh database and JWT credentials, deploys repository migrations to kitchenasty_member2_e2e, and stops only the container it created. Playwright starts dedicated servers on ports 3302 (API), 5273 (admin) and 5274 (storefront). Vite proxies browser requests to that API. All four ports must be free. The config validates the database URL; each fixture also reads the database name and role from PostgreSQL before writing. Each test uses an isolated browser context, unique synthetic accounts, a real password login, one location, two tables, and one reservation. Fixture records are removed after read-back. Execution is serial with zero retries.

## UC-M2-01: customer checks availability

**Preconditions.** A synthetic customer is authenticated. The location has active two- and four-seat tables. Date A is seven days ahead in UTC, date B eight. On A a confirmed party of four has the four-seat table at 19:00. B has no bookings.

**Common postcondition.** PostgreSQL reservations and table rows for this location equal the before snapshot. The browser never submits a booking. Each lookup checks the HTTP response, eligible table count, and all 22 half-hour buttons against the fixture before inspecting the specific control.

| ID | Flow | Browser steps and expected outcome |
|---|---|---|
| UC-M2-01-MAIN | Main | Select A and four guests. Verify 19:00 disabled. Click 19:30 and check its selected styling and rendered color change. |
| UC-M2-01-ALT-01 | Alternative | Keep four guests, change A to B. The new response and grid both enable 19:00. |
| UC-M2-01-ALT-02 | Alternative | On A change from four guests to two. The eligible count goes from one to two and 19:00 becomes selectable. |
| UC-M2-01-EX-01 | Exception | Select five guests. Wait for the matching response and completed grid. The eligible count is zero, 22 buttons are rendered, the loading indicator is gone, and none is enabled. |
| UC-M2-01-EX-02 | Exception | Load A, then clear the date. The field clears and the slot label and buttons disappear. The browser request log through the cleared render contains no empty-date availability query. |

## UC-M2-02: staff processes an existing reservation

**Preconditions.** A synthetic staff member is authenticated. One existing reservation has the starting status below. Its ID, booking details and table assignment are recorded before the first action.

**Common postcondition.** Each successful change is checked against the response ID/status, a visible badge and the full stored reservation. Only status and the update timestamp may change. The final status survives reload. Each invalid attempt must be prevented by the UI or return a client error and show rejection, with the full original row preserved after reload. The observation captures the actual action outcome before checking rejection.

| ID | Flow | Starting state and expected outcome |
|---|---|---|
| UC-M2-02-MAIN | Main | From PENDING use list actions Confirm, Seat and Complete. Check the same ID in PostgreSQL and the on-screen row after each step, then reload and verify COMPLETED. |
| UC-M2-02-ALT-01 | Alternative | Cancel a PENDING booking from its list row. Verify CANCELLED in the row, after reload, and in PostgreSQL. |
| UC-M2-02-ALT-02 | Alternative | Cancel a CONFIRMED booking from detail. Verify CANCELLED in the badge, after reload, and in PostgreSQL. |
| UC-M2-02-EX-01 | Exception | Attempt PENDING to COMPLETED directly on detail. Expect prevention or a visible rejection, with PENDING retained. |
| UC-M2-02-EX-02 | Exception | Attempt CANCELLED to CONFIRMED on detail. Expect prevention or a visible rejection, with CANCELLED retained. |

The lifecycle basis is packages/docs/features/reservations.md. CANCELLED is assumed terminal pending team approval. The meaning of COMPLETED to CANCELLED remains open and is outside these ten flows. Member 1 covers booking submission and assignment edits. These cases query availability and update only status through the real browser UI.

## Evidence

Each invocation prints a new timestamped directory under test-results/member2-e2e/. It contains migrations.txt, raw Playwright results.json, and per-test screenshots, trace archives and observations.json (fixture snapshot, relevant HTTP and UI observations, and final database snapshot before cleanup). The signed sessions belong to the disposable test environment. Keep original traces private because network metadata may include synthetic bearer tokens. Open a trace locally with npx playwright show-trace <path-to-trace.zip>. See RESULTS.md for the reviewed run and failure evidence.

**Open follow-up.** The dedicated Member 2 Playwright suite still needs GitHub Actions integration. The team must confirm whether CANCELLED is terminal before closing UC-M2-02-EX-02.
