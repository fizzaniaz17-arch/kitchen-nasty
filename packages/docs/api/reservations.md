# 📅 Reservations API

## 🔍 Check Availability

```
GET /api/reservations/availability?locationId=...&date=2025-06-15&time=19:00&partySize=4
```

Public and read-only. Always returns the daily slots and eligible table count. If a valid HH:MM time is supplied, the response also includes requested-time availability and currently available tables. An invalid time returns 400.

**Response:**

```json
{
  "success": true,
  "data": {
    "slots": [{ "time": "19:00", "available": true }],
    "totalTables": 1,
    "available": true,
    "tables": [
      { "id": "table-id", "name": "Table 3", "capacity": 4 }
    ]
  }
}
```

The slots array is abbreviated here; the endpoint returns all daily slots.

## ➕ Create Reservation

```
POST /api/reservations
Authorization: Bearer <customer-token>
Idempotency-Key: <optional-key>
```

An optional customer-scoped key replays the original 201 response for identical validated reservation details during its 24-hour lifetime. Reusing it with different details during that period returns 409. At or after expiry, the key can create a new booking. Without a key, each request creates a separate booking. Deployment requires the encryption keys and cleanup schedule described in the SQE idempotency security review.

**Request:**

```json
{
  "locationId": "location-id",
  "date": "2025-06-15",
  "time": "19:00",
  "partySize": 4,
  "comment": "Birthday dinner, window seat preferred"
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "cuid",
    "date": "2025-06-15",
    "time": "19:00",
    "partySize": 4,
    "status": "PENDING",
    "comment": "Birthday dinner, window seat preferred"
  }
}
```

## 🛍️ List Customer Reservations

```
GET /api/reservations/my-reservations
Authorization: Bearer <customer-token>
```

Returns reservations for the authenticated customer.

## 📋 List All Reservations (Staff)

```
GET /api/reservations
Authorization: Bearer <staff-token>
```

Returns all reservations with pagination. Staff only.

## 🔍 Get Reservation

```
GET /api/reservations/:id
Authorization: Bearer <customer-token|staff-token>
```

Returns a single reservation. A customer may only read their own booking; staff may read any.
Requesting another customer's reservation returns `403 Access denied`.

## ✏️ Update Reservation

```
PATCH /api/reservations/:id
Authorization: Bearer <staff-token>
```

**Request:**

```json
{
  "status": "CONFIRMED",
  "tableId": "table-id"
}
```

## 🗑️ Delete Reservation

```
DELETE /api/reservations/:id
Authorization: Bearer <staff-token>
```

## 🔒 Permissions Summary

| Action | Required Role |
|--------|--------------|
| 🌐 Check availability | Public |
| ➕ Create reservation | Authenticated customer |
| 👤 View own reservations | Authenticated customer |
| 🔍 Get reservation | Owner or Staff |
| 📋 List all reservations | Staff |
| ✏️ Update reservation | Staff |
| 🗑️ Delete reservation | Staff |

## ⚠️ Error Cases

| Scenario | Status | Error |
|----------|--------|-------|
| No tables available for a requested time | `200` | `available: false` and an empty `tables` array |
| No eligible table for the requested party size | `200` | Daily slots are unavailable; requested-time tables are empty |
| Inactive or unknown location on creation | `400` | Location not found or inactive |
| 📅 Past date | `400` | Cannot reserve in the past |
