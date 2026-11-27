# Student 3 Reservation Use Cases

## UC-1 — Customer Creates a Reservation

| Field | Value |
|---|---|
| Use Case ID | UC-1 |
| Use Case Name | Customer Creates a Reservation |
| Primary Actor | Registered customer |
| Supporting Actors | PostgreSQL, KitchenAsty reservation API, restaurant location |
| Preconditions | The customer is registered and logged in. At least one active location and one active table exist. |
| Trigger | The customer opens `/reservations` and submits the booking form. |
| Description | A customer selects an active restaurant location, date, party size, available time slot, and optional comment, then creates a reservation. |
| Postconditions | A CUID-backed reservation record exists with `PENDING` status unless the application configuration changes it, and the customer can see the record in My Reservations. |

### Main success flow

1. The customer opens `/reservations`.
2. The storefront loads active locations.
3. The customer selects a location.
4. The customer selects a date.
5. The customer selects a party size; the default is 2.
6. The storefront requests availability with location, date, and party size.
7. The API returns generated 30-minute time slots from 11:00 through 21:30.
8. The customer selects an available time.
9. The customer optionally enters a special request.
10. The customer submits the form.
11. The API validates the payload and confirms the location is active.
12. The API creates a reservation owned by the authenticated customer's ID.
13. The storefront displays `Reservation created!`.
14. The storefront reloads `/api/reservations/my-reservations`.

### Alternative flows

- **A1 — Customer changes party size:** The availability request is repeated for the new party size and the slot list is refreshed.
- **A2 — Customer changes date or location:** The availability request is repeated using the current location, date, and party size.
- **A3 — Customer changes an already selected time:** The selected slot state updates before submission.
- **A4 — Customer adds a comment:** The comment is sent as optional `comment` data.
- **A5 — A location has no suitable active table:** The availability response contains no available slots and the UI shows `No available time slots`.

### Exception flows

- **E1 — Customer is unauthenticated:** The UI shows the login prompt and disables submission.
- **E2 — Location, date, or time is missing:** The UI reports that the customer must complete the required booking fields.
- **E3 — Invalid payload:** The API returns `400` with validation errors for malformed date/time, missing location, or party size outside 1–50.
- **E4 — Location is unknown or inactive:** The API returns `400`.
- **E5 — API or database failure:** The UI displays the submission error and does not claim success.
- **E6 — No suitable slot exists:** The UI shows no-slots feedback and no booking is created.

### Related business rules

- Party size must be an integer from 1 through 50.
- Date must use `YYYY-MM-DD`; time must use `HH:MM`.
- Reservations are owned by `Customer.id`, not `User.id`.
- Staff accounts cannot create customer-owned reservations.
- Availability considers active tables with capacity at least the party size.
- Cancelled reservations do not reserve availability.
- The UI-generated time range does not verify operating hours and must not be
  documented as a database-proven availability rule.

### Traceability

| Requirement | Evidence |
|---|---|
| Customer can view and submit reservation form | Storefront reservation page |
| Availability is location/date/party-size dependent | `checkAvailability` |
| Customer ownership is enforced | `createReservation` sets `customerId` from the customer token |
| Customer can list own records | `GET /api/reservations/my-reservations` |

---

## UC-2 — Admin/Staff Manages a Reservation

| Field | Value |
|---|---|
| Use Case ID | UC-2 |
| Use Case Name | Admin/Staff Manages a Reservation |
| Primary Actor | Staff, manager, or super admin |
| Supporting Actors | PostgreSQL, reservation API, table API |
| Preconditions | The staff account is authenticated and active. The target reservation exists. |
| Trigger | The staff member opens `/reservations` or a reservation detail URL. |
| Description | Staff reviews reservations and updates supported status/table information. |
| Postconditions | The same CUID reservation record is updated, or no change occurs if the operation is denied or invalid. |

### Main success flow

1. Staff signs in to the admin application.
2. Staff opens `/reservations`.
3. The UI requests the paginated reservation list.
4. Staff optionally filters by status or date.
5. Staff opens a reservation's `Details` link.
6. The detail page loads the reservation and active tables for its location.
7. Staff reviews customer, party, date/time, location, table, comment, and status.
8. Staff selects a status or assigns/unassigns a table.
9. The UI sends `PATCH /api/reservations/:id`.
10. The API updates the same reservation identifier and returns the updated record.
11. The UI displays the updated status/table.

### Alternative flows

- **A1 — Filter by status:** The list sends `status` and retains pagination.
- **A2 — Filter by date:** The list sends `date`.
- **A3 — Assign a table:** Staff selects a table with capacity and location data.
- **A4 — Unassign a table:** Staff selects `No table assigned`, sending `tableId: null`.
- **A5 — Cancel:** Staff selects `CANCELLED` from the detail page or list action.

### Exception flows

- **E1 — User is unauthenticated:** The admin app redirects to its login view.
- **E2 — Customer token attempts reservation listing:** The API returns `403`.
- **E3 — Reservation does not exist:** The API returns `404`; the detail UI shows an error/back link.
- **E4 — Invalid status/table/date/time/party-size payload:** The API returns `400`.
- **E5 — API/database failure:** The UI shows an error and retains the prior UI state where possible.
- **E6 — Staff lacks sufficient role for table management:** Table create/update/delete routes reject the operation.

### Status and transition observations

The schema and list UI expose `PENDING`, `CONFIRMED`, `SEATED`, `COMPLETED`,
and `CANCELLED`. The detail UI allows any listed status to be selected.
The API's update schema accepts an enum status but does not implement
transition-state validation. Consequently, this use case does not claim that
invalid transition rejection exists; automated testing should verify the
actual behavior and report defects honestly.

### Related business rules

- All reservation list, update, and delete operations require a staff JWT.
- Any staff role may list/read reservations; table assignment is possible
  through the staff reservation update route.
- Customer principals cannot update or delete reservations.
- Customers may read only their own reservation by ID.
- Table assignment stores `tableId` and does not itself enforce party-size
  capacity in the reservation update controller.
- Super admin, manager, and staff role boundaries must be tested where
  Student 3 reaches table-management routes.

### Traceability

| Requirement | Evidence |
|---|---|
| Staff can list reservations | `GET /api/reservations` with `requireStaff` |
| Staff can open a record | `GET /api/reservations/:id` |
| Staff can update status/table | `PATCH /api/reservations/:id` |
| Record identity remains stable | CUID `Reservation.id` is retained on updates |
| Customer ownership remains protected | Cross-customer `GET` returns `403` |
