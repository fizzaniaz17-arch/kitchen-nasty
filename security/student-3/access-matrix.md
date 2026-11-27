# Student 3 Reservation Access Matrix

This matrix reflects the inspected code for KitchenAsty at commit
`d6af7237e9569ebeab19ccab375362f9d144e25e`.

| Functionality | Unauthenticated | Customer | STAFF | MANAGER | SUPER_ADMIN |
|---|---|---|---|---|---|
| Check reservation availability | Allowed | Allowed | Allowed | Allowed | Allowed |
| Create reservation | Denied (`401`) | Allowed | Denied (`400`) | Denied (`400`) | Denied (`400`) |
| List reservations using `/my-reservations` | Denied (`401`) | Allowed, caller-scoped | Request is authenticated and filtered by staff ID; normally empty | Request is authenticated and filtered by staff ID; normally empty | Request is authenticated and filtered by staff ID; normally empty |
| Read a reservation by ID | Denied (`401`) | Own record only (`200`; other record `403`) | Allowed | Allowed | Allowed |
| List all reservations | Denied (`401`) | Denied (`403`) | Allowed | Allowed | Allowed |
| Update reservation status/table | Denied (`401`) | Denied (`403`) | Allowed | Allowed | Allowed |
| Delete reservation | Denied (`401`) | Denied (`403`) | Allowed | Allowed | Allowed |
| View reservation analytics | Denied (`401`) | Denied (`403`) | Allowed | Allowed | Allowed |
| List/read tables | Allowed | Allowed | Allowed | Allowed | Allowed |
| Create/update table | Denied (`401`) | Denied (`403`) | Denied (`403`) | Allowed | Allowed |
| Delete table | Denied (`401`) | Denied (`403`) | Denied (`403`) | Denied (`403`) | Allowed |

## Notes

- Authentication is JWT bearer-token authentication.
- Authorization distinguishes staff from customer principals and then checks
  staff roles where `requireRole` is used.
- Object ownership for reservation reads compares `reservation.customerId`
  with `req.user.id`.
- Staff accounts are `User` records; customer accounts are `Customer` records.
