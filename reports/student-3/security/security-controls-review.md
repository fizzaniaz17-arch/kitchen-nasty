# Student 3 — Security Controls Review

## Scope

This document reviews two security controls relevant to the KitchenAsty
reservation module, based on source-code analysis and testing observations.

---

## Control 1 — Authentication Enforcement (JWT Bearer Token)

### Expected Behavior

All protected API endpoints must:
1. Require a valid JWT in the `Authorization: Bearer <token>` header.
2. Reject requests without a token (HTTP 401).
3. Reject requests with an expired or malformed token (HTTP 401).
4. Refuse to start the server if the JWT secret is a known placeholder.

### Actual Implementation

**Source:** `packages/server/src/middleware/auth.ts`

| Check | Implementation | Lines |
|---|---|---|
| Header presence | `authHeader?.startsWith('Bearer ')` → 401 if missing | L51–55 |
| Token verification | `jwt.verify(token, JWT_SECRET)` → 401 if invalid/expired | L57–63 |
| Secret validation | `resolveJwtSecret()` throws if secret is in `KNOWN_PLACEHOLDER_SECRETS` | L14–22 |
| Placeholder detection | Set of 4 known weak secrets: `dev-secret-change-me`, etc. | L7–12 |

### Evidence

- **Automated test:** `reservation-access.test.ts` test 1 confirms unauthenticated → 401.
- **Source review:** `resolveJwtSecret()` is called at module import time (L24), so the server crashes on startup if the secret is weak. This is a defense-in-depth measure.
- **Token expiry:** Default 7 days via `JWT_EXPIRES_IN` env var; `jwt.verify` automatically checks `exp` claim.

### Result

✅ **Authentication enforcement is correctly implemented for all protected reservation routes.**

### Potential Weakness

| Weakness | Severity | Recommendation |
|---|---|---|
| Token stored in `localStorage` | Medium | Vulnerable to XSS. Consider `httpOnly` cookie-based sessions with CSRF protection for production. |
| Social-auth callback passes JWT in URL query | Medium | Replace with a short-lived authorization code or secure `httpOnly` cookie exchange. |
| No token refresh/rotation | Low | Long-lived tokens (7 days) increase window for stolen-token abuse. Consider refresh token rotation. |

---

## Control 2 — Role-Based Authorization (Staff/Customer Separation and Role Hierarchy)

### Expected Behavior

1. Customer accounts can only access customer-scoped endpoints (create reservation, list own, read own).
2. Staff accounts can access all reservation management endpoints.
3. Table management requires elevated roles (MANAGER or SUPER_ADMIN for create/update, SUPER_ADMIN for delete).
4. The separation is enforced server-side, not by client-side UI hiding.

### Actual Implementation

**Source:** `packages/server/src/middleware/auth.ts` and `packages/server/src/routes/reservation.routes.ts`

| Middleware | Purpose | Used By |
|---|---|---|
| `authenticate` | Verifies JWT, sets `req.user` | All protected routes |
| `requireStaff` | Checks `req.user.type === 'staff'` → 403 | Reservation list, update, delete, analytics |
| `requireRole(...roles)` | Checks `req.user.role` ∈ roles → 403 | Table create/update (MANAGER, SUPER_ADMIN), table delete (SUPER_ADMIN) |

**Object-level check in `getReservation`:**
```typescript
if (!user || (user.type !== 'staff' && reservation.customerId !== user.id)) {
  res.status(403).json({ success: false, error: 'Access denied' });
  return;
}
```

### Evidence

- **Automated tests:** 4 access-decision tests in `reservation-access.test.ts`, 12 IDOR regression tests.
- **Browser test:** `reservation-workflow.spec.ts` verifies staff can update status through the UI.
- **Source evidence:**
  - `reservation.routes.ts` L29: `router.get('/', authenticate, requireStaff, listReservations)` — middleware chain enforces both auth and staff type.
  - `reservation.routes.ts` L33: `router.patch('/:id', authenticate, requireStaff, updateReservation)`.
  - `reservation.controller.ts` L34: `const customerId = user?.type === 'customer' ? user.id : null` — prevents staff from creating customer-owned reservations.

### Result

✅ **Role-based authorization is correctly implemented and verified through automated tests.**

### Potential Weakness

| Weakness | Severity | Recommendation |
|---|---|---|
| No transition state validation | Low | The `PATCH` endpoint accepts any valid status enum value. A CANCELLED reservation can be re-activated to PENDING. Consider adding a state machine. |
| Table assignment has no capacity check | Low | Staff can assign a table with capacity < party size. Consider adding a warning or validation. |
| All staff roles have identical reservation permissions | Informational | The STAFF role can delete reservations. Consider restricting deletion to MANAGER/SUPER_ADMIN if business rules require it. |

---

## Control Summary

| Control | Expected | Observed | Status |
|---|---|---|---|
| JWT authentication on protected routes | 401 for missing/invalid tokens | ✅ Verified | Implemented |
| Placeholder secret rejection | Server refuses to start | ✅ Verified in source | Implemented |
| Staff/customer separation | Customers denied staff operations | ✅ Verified (4 tests) | Implemented |
| Object-level ownership | Customer can only read own record | ✅ Verified (12 IDOR tests) | Implemented |
| Role hierarchy for tables | MANAGER+/SUPER_ADMIN enforcement | ✅ Verified in source/existing tests | Implemented |
| Token-in-URL risk (social auth) | No URL token leakage | ❌ Not mitigated | Open finding |
| Security response headers | CSP, X-Frame-Options, X-Content-Type-Options | ❌ Not set | Open finding |
