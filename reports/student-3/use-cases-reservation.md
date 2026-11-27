# Student 3 — Use Case Specifications

## Module: Reservations and Table Management

---

## UC-S3-01 — Customer Creates a Reservation

| Field | Value |
|---|---|
| Use Case ID | UC-S3-01 |
| Use Case Name | Customer Creates a Reservation |
| Primary Actor | Registered Customer |
| Supporting Actors | PostgreSQL database, KitchenAsty Reservation API, Restaurant Location service |
| Objective | Allow a registered customer to create a reservation at a selected restaurant location for a specific date, time, and party size |
| Preconditions | 1. The customer has a registered account and is authenticated (JWT token in localStorage). 2. At least one active location exists in the system. 3. At least one active table exists at the location with sufficient capacity. |
| Trigger | The customer navigates to `/reservations` on the storefront application and submits the booking form. |

### Main Success Flow (MSF)

1. The customer opens the storefront at `/reservations`.
2. The storefront loads active locations from `GET /api/locations`.
3. The customer selects a restaurant location from the dropdown.
4. The customer selects a future date using the date picker.
5. The customer selects a party size (default is 2; range 1–50).
6. The storefront sends `GET /api/reservations/availability?locationId=...&date=...&partySize=...`.
7. The API queries active tables with capacity ≥ party size and existing non-cancelled reservations for the date.
8. The API returns generated 30-minute time slots from 11:00 through 21:30, each marked as available or unavailable.
9. The customer selects an available time slot button.
10. The customer optionally enters a special request in the comment textarea.
11. The customer clicks "Book Table".
12. The storefront sends `POST /api/reservations` with `{ locationId, date, time, partySize, comment }`.
13. The API validates the payload using Zod schema (locationId non-empty, date YYYY-MM-DD, time HH:MM, partySize 1–50).
14. The API verifies the location exists and is active.
15. The API creates a reservation record with `customerId` from the authenticated customer's JWT, status `PENDING`.
16. The storefront displays "Reservation created!" confirmation message.
17. The storefront clears the selected time and comment fields.
18. The storefront reloads the customer's reservation list via `GET /api/reservations/my-reservations`.
19. The new reservation appears in the customer's "My Reservations" list with PENDING status.

### Alternative Flows

**A1 — Customer changes party size after selecting location and date:**
- After step 5, the customer changes the party size dropdown value.
- The storefront re-sends the availability request with the updated party size.
- The time slot list refreshes to reflect availability for the new party size.
- Flow continues from step 9.

**A2 — Customer changes date or location after initial selection:**
- After steps 3–4, the customer changes the date or location.
- The storefront re-sends the availability request using the current location, date, and party size.
- Previously selected time slots are cleared.
- Flow continues from step 8.

**A3 — No suitable time slots are available:**
- At step 8, the API returns all slots as `available: false` (or zero matching tables exist).
- The storefront displays "No time slots available for this date." in place of the slot buttons.
- No booking can be submitted. The customer may change date, location, or party size.

**A4 — Customer adds a comment:**
- At step 10, the customer types a special request or dietary note.
- The comment is included as optional `comment` field in the POST payload.
- The comment is stored in the reservation record and visible to staff.

### Exception Flows

**E1 — Customer is not authenticated:**
- At step 1, the storefront detects no JWT token in localStorage.
- The reservation form displays a login/signup prompt instead of the booking controls.
- The "Book Table" button is disabled or hidden.
- No reservation data is submitted.

**E2 — API validation rejects the payload:**
- At step 13, the Zod schema validation fails (e.g., date format invalid, party size outside 1–50, missing locationId).
- The API returns HTTP 400 with `{ success: false, error: [...validation errors] }`.
- The storefront displays the error message.
- No reservation record is created.
- The form retains the customer's entered values.

**E3 — Location is inactive or does not exist:**
- At step 14, the API finds no matching active location.
- The API returns HTTP 400 with `{ success: false, error: "Location not found or inactive" }`.
- The storefront displays the error.
- No reservation is created.

**E4 — API or database failure during submission:**
- At step 15, the database is unavailable or an internal error occurs.
- The API returns a 5xx error.
- The storefront displays the error message (not "Reservation created!").
- No reservation record is created.
- The customer can retry the submission.

### Postconditions

- **Success:** A new reservation record exists in the database with a CUID identifier, `PENDING` status, the authenticated customer's ID, and the submitted location/date/time/party size/comment. The customer can see the reservation in their list.
- **Failure:** No reservation record is created. The customer sees an appropriate error message. Existing data is not modified.

### Relevant Functional Requirements

| ID | Requirement |
|---|---|
| FR-R01 | Customer can view the reservation form with location, date, party size, and time slot selection |
| FR-R02 | Availability is location/date/party-size dependent and considers active tables |
| FR-R03 | Customer ownership is enforced — reservations are owned by Customer.id from the JWT |
| FR-R04 | Customer can list their own reservation records via /my-reservations |
| FR-R05 | Staff accounts cannot create customer-owned reservations |

### Business Rules

| Rule | Description |
|---|---|
| BR-R01 | Party size must be an integer from 1 through 50 |
| BR-R02 | Date must follow YYYY-MM-DD format; time must follow HH:MM format |
| BR-R03 | Reservations are owned by Customer.id, not User.id (staff table) |
| BR-R04 | Staff tokens are rejected with HTTP 400 when attempting to create reservations |
| BR-R05 | Availability considers active tables with capacity ≥ party size |
| BR-R06 | Cancelled reservations do not block availability |
| BR-R07 | The UI generates time ranges from 11:00–21:30 in 30-minute intervals; this is application logic, not operating-hours validation |
| BR-R08 | New reservations are created with PENDING status by default |

### Data Read or Modified

| Data | Operation | Description |
|---|---|---|
| Location | Read | Active locations loaded for the dropdown |
| Table | Read | Active tables queried for availability check |
| Reservation | Read | Existing non-cancelled reservations queried for availability |
| Reservation | Create | New reservation record created on successful submission |
| Customer (JWT) | Read | Customer ID extracted from JWT for ownership |

### Expected Application Response

| Scenario | Response |
|---|---|
| Successful creation | HTTP 201, `{ success: true, data: { ...reservation } }`, UI shows "Reservation created!" |
| Validation failure | HTTP 400, `{ success: false, error: [...] }`, UI shows error |
| Inactive location | HTTP 400, `{ success: false, error: "Location not found or inactive" }` |
| Unauthenticated | HTTP 401, `{ success: false, error: "Authentication required for reservations" }` |
| Staff token | HTTP 400, `{ success: false, error: "Reservations can only be created by a customer account" }` |

---

## UC-S3-02 — Admin/Staff Manages a Reservation

| Field | Value |
|---|---|
| Use Case ID | UC-S3-02 |
| Use Case Name | Admin/Staff Manages a Reservation |
| Primary Actor | Staff member (STAFF, MANAGER, or SUPER_ADMIN role) |
| Supporting Actors | PostgreSQL database, Reservation API, Table API |
| Objective | Allow authenticated staff to view, filter, and update reservation records including status changes and table assignments |
| Preconditions | 1. The staff account is authenticated with a valid JWT (type: 'staff'). 2. The staff account has an active role (STAFF, MANAGER, or SUPER_ADMIN). 3. The target reservation exists in the database. |
| Trigger | The staff member opens `/reservations` or a specific reservation detail URL in the admin application. |

### Main Success Flow (MSF)

1. Staff signs in to the admin application at `http://localhost:5173` using staff credentials.
2. The admin app stores the JWT in localStorage and loads the authenticated layout.
3. Staff navigates to `/reservations`.
4. The admin app sends `GET /api/reservations?page=1&limit=20` with the staff JWT.
5. The API validates the JWT, confirms `type: 'staff'`, and returns a paginated reservation list.
6. The admin displays reservation records in a table with customer name, date, time, party size, status, location, and table assignment.
7. Staff clicks "Details" on a specific reservation.
8. The admin navigates to `/reservations/:id`.
9. The admin sends `GET /api/reservations/:id` and `GET /api/locations/:locationId/tables` for the reservation's location.
10. The detail page displays customer info, party size, date/time, location, table assignment, comment, and current status.
11. Staff clicks a status action button (e.g., "Set status to CONFIRMED").
12. The admin sends `PATCH /api/reservations/:id` with `{ status: "CONFIRMED" }`.
13. The API validates the payload, finds the reservation, updates the status.
14. The API returns the updated reservation record.
15. The admin displays the updated status (e.g., "CONFIRMED").

### Alternative Flows

**A1 — Filter reservations by status:**
- At step 4, staff selects a status filter (e.g., "CANCELLED") from the dropdown.
- The admin sends `GET /api/reservations?status=CANCELLED&page=1&limit=20`.
- The list shows only reservations with the selected status.
- Pagination is maintained.

**A2 — Filter reservations by date:**
- At step 4, staff enters a date in the date filter input.
- The admin sends `GET /api/reservations?date=YYYY-MM-DD`.
- The list shows only reservations for the selected date.
- Filters can be combined (status + date).

**A3 — Assign a table to the reservation:**
- At step 11, staff selects a table from the table dropdown on the detail page.
- The admin sends `PATCH /api/reservations/:id` with `{ tableId: "table-id" }`.
- The API updates the reservation's tableId.
- The detail page shows the assigned table name and capacity.

**A4 — Unassign a table:**
- At step 11, staff selects "No table assigned" from the table dropdown.
- The admin sends `PATCH /api/reservations/:id` with `{ tableId: null }`.
- The API clears the table assignment.

**A5 — Cancel the reservation:**
- At step 11, staff clicks the "Cancel" or "Set status to CANCELLED" action.
- The admin sends `PATCH /api/reservations/:id` with `{ status: "CANCELLED" }`.
- The reservation status changes to CANCELLED.
- The cancelled reservation no longer blocks availability for its time slot.

### Exception Flows

**E1 — Staff is not authenticated:**
- At step 1, the admin app detects no JWT or an expired JWT.
- The admin app redirects to the login view.
- No reservation data is loaded or displayed.

**E2 — Customer token attempts to list all reservations:**
- At step 4, a request with a customer-type JWT is sent to `GET /api/reservations`.
- The `requireStaff` middleware returns HTTP 403 `{ success: false, error: "Staff access required" }`.
- No reservation list is returned.

**E3 — Reservation does not exist:**
- At step 9, the API receives a request for a non-existent reservation ID.
- The API returns HTTP 404 `{ success: false, error: "Reservation not found" }`.
- The admin detail page shows an error state or back link.

**E4 — Invalid status or update payload:**
- At step 12, the PATCH payload contains an invalid status enum value.
- The Zod schema validation fails.
- The API returns HTTP 400 with validation errors.
- The reservation is not modified.

### Status and Transition Observations

The schema and list UI expose the following status values: `PENDING`, `CONFIRMED`, `SEATED`, `COMPLETED`, `CANCELLED`. The detail UI presents action buttons for each status transition. However, the API's update schema accepts any valid enum status without enforcing sequential transition validation. This means:

- A CANCELLED reservation can be set back to PENDING without server-side rejection.
- The progression PENDING → CONFIRMED → SEATED → COMPLETED is a UI convention, not a database or API constraint.

This is documented as an observed design characteristic, not an assumed defect.

### Postconditions

- **Success:** The reservation record is updated with the new status/table assignment. The CUID identifier remains the same. The change is immediately visible in the admin UI.
- **Failure:** The reservation record is not modified. An appropriate error message is displayed.

### Relevant Functional Requirements

| ID | Requirement |
|---|---|
| FR-M01 | Staff can list all reservations with pagination |
| FR-M02 | Staff can filter reservations by status and date |
| FR-M03 | Staff can open and view a specific reservation's details |
| FR-M04 | Staff can update reservation status |
| FR-M05 | Staff can assign/unassign tables to reservations |
| FR-M06 | Customer accounts cannot access the staff reservation list or modify reservations |
| FR-M07 | Reservation identity (CUID) is preserved across updates |

### Business Rules

| Rule | Description |
|---|---|
| BR-M01 | All reservation list, update, and delete operations require a staff JWT |
| BR-M02 | Any staff role (STAFF, MANAGER, SUPER_ADMIN) may list/read reservations |
| BR-M03 | Customer principals cannot update or delete reservations (HTTP 403) |
| BR-M04 | Customers can only read their own reservation by ID (ownership check on customerId) |
| BR-M05 | Table assignment stores tableId without enforcing party-size capacity validation |
| BR-M06 | Table creation/update requires MANAGER or SUPER_ADMIN role |
| BR-M07 | Table deletion requires SUPER_ADMIN role only |

### Data Read or Modified

| Data | Operation | Description |
|---|---|---|
| Reservation | Read | Reservation list and individual records loaded |
| Reservation | Update | Status, tableId, or other fields modified via PATCH |
| Table | Read | Active tables loaded for the reservation's location |
| Customer | Read | Customer details included in reservation response |
| Location | Read | Location details included in reservation response |

### Expected Application Response

| Scenario | Response |
|---|---|
| Staff lists reservations | HTTP 200, paginated list with reservation data |
| Staff updates status | HTTP 200, `{ success: true, data: { ...updated reservation } }` |
| Non-existent reservation | HTTP 404, `{ success: false, error: "Reservation not found" }` |
| Customer attempts staff list | HTTP 403, `{ success: false, error: "Staff access required" }` |
| Invalid update payload | HTTP 400, `{ success: false, error: [...validation errors] }` |
| Unauthenticated request | HTTP 401, `{ success: false, error: "Authentication required" }` |

---

## Traceability Matrix

| Use Case | Test Automation | Report Evidence |
|---|---|---|
| UC-S3-01 MSF | `e2e/student-3/reservation-workflow.spec.ts` — customer creates reservation | Screenshots, API verification |
| UC-S3-01 A1 | `e2e/student-3/reservation-form-flows.spec.ts` — party size change | Availability URL assertions |
| UC-S3-01 A3 | `e2e/student-3/reservation-form-flows.spec.ts` — no-slots feedback | UI text assertion |
| UC-S3-01 E1 | `e2e/student-3/use-case-flows.spec.ts` — unauthenticated check | Login prompt assertion |
| UC-S3-01 E4 | `e2e/student-3/reservation-form-flows.spec.ts` — API failure | Error message assertion |
| UC-S3-02 MSF | `e2e/student-3/reservation-workflow.spec.ts` — admin confirms reservation | Status update verification |
| UC-S3-02 A1 | `e2e/student-3/reservation-admin-flows.spec.ts` — status filter | Filter request assertions |
| UC-S3-02 A2 | `e2e/student-3/reservation-admin-flows.spec.ts` — date filter | Filter request assertions |
| UC-S3-02 E2 | `security/student-3/authorization-tests/reservation-access.test.ts` | API-level 403 assertion |
| UC-S3-02 E3 | `e2e/student-3/use-case-flows.spec.ts` — missing reservation | 404/error assertion |
