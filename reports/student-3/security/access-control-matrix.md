# Student 3 — Role-Based Access Control Matrix

## Purpose

This document presents the access-control test matrix for two application roles
(Customer and Staff) across the reservation management API. Each entry documents
the expected permission, the expected API response, the observed result from
automated testing, and the evidence source.

---

## Tested Roles

| Role | JWT Type | Description |
|---|---|---|
| Customer | `type: 'customer'` | Registered customer account; owns reservations |
| Staff | `type: 'staff', role: 'STAFF'` | Staff-level administrative access |

---

## Access Control Matrix

| # | Role | Action | Endpoint | Expected Permission | Expected Result | Observed Result | Evidence |
|---:|---|---|---|---|---|---|---|
| 1 | Staff | List all reservations | `GET /api/reservations` | **Allowed** | HTTP 200 with paginated list | HTTP 200 ✅ | `reservation-access.test.ts` test 2 & `security-rbac.spec.ts` test 2 |
| 2 | Customer | List all reservations | `GET /api/reservations` | **Denied** | HTTP 403 "Staff access required" | HTTP 403 ✅ | `security-rbac.spec.ts` test 3 |
| 3 | Unauthenticated | List all reservations | `GET /api/reservations` | **Denied** | HTTP 401 "Authentication required" | HTTP 401 ✅ | `reservation-access.test.ts` test 1 & `security-rbac.spec.ts` test 1 |
| 4 | Customer | Read own reservations | `GET /api/reservations/my-reservations` | **Allowed** | HTTP 200 with customer's reservations | HTTP 200 ✅ | `security-rbac.spec.ts` test 5 |
| 5 | Customer | Read another customer's reservation | `GET /api/reservations/:otherId` | **Denied** | HTTP 403 "Access denied" (no PII leaked) | HTTP 403, no PII ✅ | `reservation-access.test.ts` test 3 & `reservation-idor.regression.test.ts` |
| 6 | Customer | Update reservation status | `PATCH /api/reservations/:id` | **Denied** | HTTP 403 "Staff access required" | HTTP 403 ✅ | `reservation-access.test.ts` test 4 & `security-rbac.spec.ts` test 4 |
| 7 | Customer | Delete reservation | `DELETE /api/reservations/:id` | **Denied** | HTTP 403 "Staff access required" | HTTP 403 ✅ | `reservation-access.test.ts` test 4 & `security-rbac.spec.ts` test 4 |
| 8 | Staff | Update reservation status | `PATCH /api/reservations/:id` | **Allowed** | HTTP 200 with updated data | HTTP 200 ✅ | `e2e/student-3/reservation-workflow.spec.ts` |

---

## Automated Test Evidence

### Student 3 Authorization Tests (`security/student-3/authorization-tests/reservation-access.test.ts`)

| Test | Description | Result |
|---|---|---|
| 1 | Denies unauthenticated access to the protected reservation list | ✅ Passed |
| 2 | Allows authorized staff to list reservations | ✅ Passed |
| 3 | Denies a customer reading another customer's reservation | ✅ Passed |
| 4 | Denies a customer updating or deleting an admin-only reservation | ✅ Passed |

**Total: 4/4 passed**

### Existing IDOR Regression Tests (`packages/server/src/__tests__/integration/reservation-idor.regression.test.ts`)

12 additional tests covering:
- Owner customer reads own record → 200
- Other customer reads another's record → 403 (no PII leaked)
- Staff reads any record → 200
- Missing authentication → 401
- Malformed principal scenarios

**Total: 12/12 passed**

---

## Server-Side Enforcement

The access decisions are enforced at the server level through middleware and controller logic:

1. **`authenticate` middleware** (`packages/server/src/middleware/auth.ts`): Extracts and verifies the JWT from the Authorization header. Returns 401 if missing or invalid.

2. **`requireStaff` middleware**: Checks `req.user.type === 'staff'`. Returns 403 if the principal is not staff.

3. **`requireRole` middleware**: Checks `req.user.role` against allowed roles. Used for table management routes (MANAGER, SUPER_ADMIN).

4. **Object-level ownership check** (`getReservation`): After fetching the reservation, checks if the principal is staff OR if `reservation.customerId === user.id`. Returns 403 without data if neither condition is met.

These tests verify **actual server-side enforcement**, not client-side UI hiding. The `requireStaff` middleware runs before the controller, so a customer token is rejected regardless of the request body or parameters.
