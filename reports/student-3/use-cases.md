# Student 3 Use Case Specifications

## Scope

This report documents the existing Playwright browser scenarios for the reservation and table-management workflows. The tests use synthetic users and mocked API responses; they validate frontend behavior and request handling rather than live database persistence.

## UC-M1-01: Create a Reservation

**Primary actor:** Customer

**Preconditions:** The customer is on the reservation page and a location is available.

**Main flow:**
1. Select a restaurant location.
2. Select a reservation date.
3. Select an available time slot.
4. Choose the party size.
5. Optionally enter a special request.
6. Submit the reservation.
7. Verify the success message and submitted reservation data.

**Postcondition:** The mocked reservation collection contains the submitted reservation.

### Scenarios

| ID | Scenario | Expected result |
|---|---|---|
| UC-M1-01-MAIN | Create a reservation using default party size | Success message and one recorded reservation |
| UC-M1-01-ALT-01 | Select a different party size and add a special request | Submitted data contains the selected party size and comment |
| UC-M1-01-ALT-02 | Select an unavailable time slot | The unavailable slot is disabled |
| UC-M1-01-EX-01 | Submit without selecting required booking details | Validation prevents reservation creation |
| UC-M1-01-EX-02 | API rejects reservation creation | Error is displayed and no reservation is recorded |

**Implementation:** `e2e/storefront/member1-reservation.spec.ts`

## UC-M1-02: Assign a Table

**Primary actor:** Restaurant manager

**Preconditions:** The manager can access a reservation and its table-assignment interface.

**Main flow:**
1. Open a reservation.
2. View available tables.
3. Select an eligible table.
4. Submit the assignment.
5. Verify the updated table assignment.

**Postcondition:** The displayed reservation reflects the selected table.

### Scenarios

| ID | Scenario | Expected result |
|---|---|---|
| UC-M1-02-MAIN | Assign Table A | Reservation displays Table A |
| UC-M1-02-ALT-01 | Change assignment to Table B | Reservation displays Table B |
| UC-M1-02-ALT-02 | Clear an existing assignment | Reservation displays Unassigned |
| UC-M1-02-EX-01 | API rejects assignment update | Error is displayed and previous assignment remains |
| UC-M1-02-EX-02 | No tables are available | Only the unassigned option is displayed |

**Implementation:** `e2e/admin/member1-table-assignment.spec.ts`

## Execution and limitations

The recorded full Playwright run completed with 135 passed and 5 failed tests.

The four failures associated with the reservation workflow were traced to an authentication mock response shape that does not match the storefront AuthContext expectation. The remaining footer test failure was intermittent and passed during an isolated rerun.

These specifications use mocked API responses and synthetic identities. They do not independently prove backend persistence or production behavior.
