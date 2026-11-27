# Student 3 — Attack Surface Documentation

## Module: Reservations and Table Management

---

## 1. API Endpoint Inventory

### Reservation Routes (`/api/reservations`)

| Endpoint | Method | Auth Required | Staff Only | State-Changing | Sensitive Data |
|---|---|---|---|---|---|
| `/availability` | GET | No | No | No | No |
| `/my-reservations` | GET | Yes (customer) | No | No | Yes (customer's reservations) |
| `/analytics` | GET | Yes (staff) | Yes | No | Yes (business analytics) |
| `/` | POST | Yes (customer) | No | **Yes** (creates record) | Yes (customer identity) |
| `/` | GET | Yes (staff) | Yes | No | Yes (all customer data) |
| `/:id` | GET | Yes (any) | No | No | Yes (reservation + customer PII) |
| `/:id` | PATCH | Yes (staff) | Yes | **Yes** (modifies record) | Yes (reservation state) |
| `/:id` | DELETE | Yes (staff) | Yes | **Yes** (deletes record) | No |

### Table Routes (`/api/locations/:locationId/tables`)

| Endpoint | Method | Auth Required | Role Required | State-Changing |
|---|---|---|---|---|
| `/` | GET | No | None | No |
| `/:tableId` | GET | No | None | No |
| `/` | POST | Yes (staff) | MANAGER or SUPER_ADMIN | **Yes** |
| `/:tableId` | PATCH | Yes (staff) | MANAGER or SUPER_ADMIN | **Yes** |
| `/:tableId` | DELETE | Yes (staff) | SUPER_ADMIN only | **Yes** |

### Authentication Routes (`/api/auth`)

| Endpoint | Method | Description |
|---|---|---|
| `/customer/login` | POST | Customer JWT issuance |
| `/staff/login` | POST | Staff JWT issuance |
| `/me` | GET | Token identity verification |

---

## 2. Authentication Requirements

| Property | Implementation |
|---|---|
| Mechanism | JWT bearer token in `Authorization: Bearer <token>` header |
| Token Generation | `jwt.sign()` with server-side `JWT_SECRET` |
| Token Expiry | Configured via `JWT_EXPIRES_IN` env var (default: 7 days) |
| Token Storage | `localStorage` in both admin and storefront clients |
| Secret Validation | Server rejects known placeholder secrets at startup |
| Token Types | `staff` (User table) and `customer` (Customer table) |

### Security Observations

- **localStorage storage:** Tokens stored in localStorage are accessible to any JavaScript executing on the same origin. An XSS vulnerability would expose the token.
- **No CSRF protection needed:** Since authentication uses Authorization headers (not cookies), traditional CSRF attacks are not applicable.
- **Social auth token-in-URL:** The social auth callback (`packages/server/src/controllers/social-auth.controller.ts`) passes the JWT as a URL query parameter, which can be logged by browsers, proxy servers, and referrer headers.

---

## 3. User Roles and Permissions

| Role | Type | Reservation Permissions |
|---|---|---|
| Unauthenticated | None | Check availability, read public location/table data only |
| Customer | Customer JWT | Create reservation, list own reservations, read own reservation by ID |
| STAFF | Staff JWT | List/read/update/delete all reservations |
| MANAGER | Staff JWT | List/read/update/delete all reservations + create/update tables |
| SUPER_ADMIN | Staff JWT | List/read/update/delete all reservations + create/update/delete tables |

---

## 4. Sensitive Data Exposure

| Data | Endpoint | Protection |
|---|---|---|
| Customer email | `GET /api/reservations` (staff list) | Staff-only access via `requireStaff` |
| Customer email | `GET /api/reservations/:id` | Ownership check: customer can only read own record |
| Customer phone | `GET /api/reservations` and `/:id` | Same as email |
| All reservation data | `GET /api/reservations` | Staff-only |
| Business analytics | `GET /api/reservations/analytics` | Staff-only |

### IDOR Protection

The `GET /api/reservations/:id` endpoint implements an object-level ownership check:
- If the principal is `type: 'staff'`, access is granted to any reservation.
- If the principal is `type: 'customer'`, access is granted only if `reservation.customerId === user.id`.
- Otherwise, HTTP 403 is returned **without** the reservation data.

This was tested and verified by the existing regression suite (`reservation-idor.regression.test.ts`, 12 tests) and Student 3's additional authorization tests (4 tests).

---

## 5. State-Changing Operations

| Operation | Endpoint | Authorization | Validation |
|---|---|---|---|
| Create reservation | POST `/` | Customer token required | Zod schema: locationId, date (YYYY-MM-DD), time (HH:MM), partySize (1–50) |
| Update reservation | PATCH `/:id` | Staff token required | Zod schema: status enum, tableId nullable, date, time, partySize (1–50) |
| Delete reservation | DELETE `/:id` | Staff token required | Reservation must exist (404 if not) |
| Create table | POST `/tables` | MANAGER or SUPER_ADMIN | Name and capacity required |
| Update table | PATCH `/tables/:id` | MANAGER or SUPER_ADMIN | Fields validated |
| Delete table | DELETE `/tables/:id` | SUPER_ADMIN only | Cannot delete table with existing reservations |

---

## 6. Potential Attack Surfaces

| Surface | Description | Risk | Mitigation Status |
|---|---|---|---|
| JWT in localStorage | Vulnerable to XSS-based token theft | Medium | No CSP header; relies on React's built-in XSS protection |
| Social auth token in URL | JWT passed as query parameter in OAuth callback | Medium | Not mitigated; documented as open finding |
| Missing security headers | No CSP, X-Frame-Options, or X-Content-Type-Options on responses | Medium | Documented in ZAP findings; needs production Nginx config |
| Rate limiting | Global rate limit of 100 req/15 min; can be bypassed by restarting server | Low | Adequate for development; production needs distributed limiting |
| No transition validation | Reservation status can be set to any enum value without sequencing | Low | Business logic gap; not a security vulnerability |
| Availability race condition | No database-level constraint prevents double-booking same table/time | Low | Application-level check in `checkAvailability`; documented limitation |
