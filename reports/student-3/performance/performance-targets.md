# Student 3 — Performance Testing Targets

## Selected Operation

**Endpoint:** `GET /api/reservations/availability`

**Parameters:** `?locationId=<id>&date=<YYYY-MM-DD>&partySize=<n>`

### Why This Operation is Suitable

1. **Realistic workflow operation:** Availability checking is the most frequently called
   reservation endpoint — every customer visit to the booking page triggers it, and
   every change to location, date, or party size triggers an additional request.

2. **Read-only and safe:** The endpoint does not create, update, or delete any records,
   making it safe for repeated load testing without polluting the database.

3. **Representative database interaction:** The endpoint queries both the `tables` and
   `reservations` tables, exercising real database reads under load.

4. **Measurable under concurrency:** As a stateless GET request, it can be meaningfully
   tested with multiple concurrent virtual users to observe contention effects.

---

## Performance Targets (Defined Before Testing)

These thresholds were established before any test execution. They are based on:
- Industry benchmarks for internal API response times (sub-second for simple reads).
- The testing environment (local Docker PostgreSQL, local Express server).
- The rate-limiting configuration (100 requests per 15 minutes globally).

| Metric | Target | Justification |
|---|---|---|
| **p95 Response Time** | ≤ 800 ms | A 30-minute time-slot availability query should complete well under 1 second for a local database with ≤ 50 tables and sparse reservation data. The 800 ms target allows for Docker networking overhead and GC pauses. |
| **Failure Rate** | < 1% | No more than 1% of requests should return non-200 HTTP status codes. The endpoint has no authentication requirement and minimal validation, so failures should be near zero under normal conditions. |

### Additional Observed Metrics

The following metrics are collected for each run but do not have pass/fail thresholds:
- Average response time (ms)
- Median response time (ms)
- Requests per second (throughput)
- Total requests completed

---

## Workload Design

| Workload | Virtual Users | Duration | Pacing | Runs |
|---|---:|---|---|---:|
| Baseline | 1 VU | 60 seconds | 5-second sleep between requests | 2 |
| Concurrent | 5 VUs | 60 seconds | 10-second sleep between requests | 2 |

### Pacing Rationale

The API has a global rate limit of 100 requests per 15 minutes. At 5 VUs with no pacing,
the limit would be exceeded within seconds. The pacing intervals are configured to stay
below the limit while still generating meaningful load:

- 1 VU × 5-second pacing ≈ 12 requests/minute → well below limit
- 5 VUs × 10-second pacing ≈ 30 requests/minute → below limit

The API process was restarted between exploratory and recorded runs to reset the
in-memory rate limiter counter.
