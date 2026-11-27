# Student 3 — Performance Test Results

## Test Execution Summary

All four required workloads were executed using the `grafana/k6` Docker image
against the local KitchenAsty API (`http://host.docker.internal:3000`).

The k6 script is at `performance/student-3/reservation-load-test.js`.

---

## Results Table

| Run | VUs | Duration | Total Requests | Avg (ms) | Median (ms) | p95 (ms) | Failed Rate | Throughput (req/s) | Result |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|
| Baseline 1 | 1 | 60s | 13 | 28.37 | 23.22 | 58.97 | 0% | 0.215 | ✅ Pass |
| Baseline 2 | 1 | 60s | 13 | 27.59 | 20.75 | 58.72 | 0% | 0.215 | ✅ Pass |
| Concurrent 1 | 5 | 60s | 31 | 49.39 | 25.81 | 166.06 | 0% | 0.512 | ✅ Pass |
| Concurrent 2 | 5 | 60s | 31 | 50.42 | 37.03 | 129.47 | 0% | 0.512 | ✅ Pass |

---

## Target Comparison

| Metric | Target | Baseline 1 | Baseline 2 | Concurrent 1 | Concurrent 2 |
|---|---|---|---|---|---|
| p95 Response Time | ≤ 800 ms | 58.97 ms ✅ | 58.72 ms ✅ | 166.06 ms ✅ | 129.47 ms ✅ |
| Failure Rate | < 1% | 0% ✅ | 0% ✅ | 0% ✅ | 0% ✅ |

**All four runs passed both performance targets.**

---

## Analysis

### Does the operation meet the target?

Yes. All runs completed with:
- p95 response times ranging from 58.72 ms to 166.06 ms, well below the 800 ms target.
- Zero HTTP failures (0% failure rate), well below the 1% threshold.

### Does performance degrade under concurrency?

**Slight degradation observed:**
- Baseline p95: ~59 ms (1 VU)
- Concurrent p95: ~130–166 ms (5 VUs)

The p95 response time approximately doubles under 5× concurrency. This is expected
for a local development environment where the database, API server, and k6 runner
share the same machine's CPU and I/O. The degradation is well within acceptable limits.

The average response time increased from ~28 ms (1 VU) to ~50 ms (5 VUs), a ~78% increase.
This linear scaling is reasonable for the workload.

### Do failure rates remain acceptable?

Yes. All four runs recorded exactly 0% failure rate. The endpoint is stateless and
read-only, so there are no write-conflict failures. The pacing strategy ensured the
rate limiter was never triggered during recorded runs.

### Bottlenecks or anomalies

1. **Low throughput:** The conservative pacing (5–10 second sleep) limits throughput to
   0.2–0.5 req/s. This is intentional to avoid the rate limiter but means the test
   does not stress-test the system.

2. **Rate limiter:** An initial unpaced exploratory run with 1 VU produced 5,205 requests
   in 30 seconds and received 88 HTTP errors due to the global rate limiter (100 req/15 min).
   This was deliberately excluded from the final results.

3. **Small request counts:** 13 requests (baseline) and 31 requests (concurrent) per run
   is a small sample size. The statistical significance of p95 values is limited.

### Test environment limitations

| Factor | Detail |
|---|---|
| Machine | Local development workstation (shared CPU/RAM with other processes) |
| Database | Docker PostgreSQL container on the same host |
| k6 runner | `grafana/k6` Docker container on the same host |
| Data | Single seeded location, 10 tables, sparse reservation data |
| Network | Host-to-Docker networking (`host.docker.internal`) |
| Rate limiting | Global 100 req/15 min; in-memory counter reset on API restart |
| Concurrency | 5 VUs is the maximum tested; production traffic patterns may differ |

**These results represent a controlled development baseline, not production capacity.**

---

## Evidence Files

| File | Description |
|---|---|
| `performance/student-3/reservation-load-test.js` | k6 test script |
| `performance/student-3/baseline-60-1.json` | Baseline run 1 summary |
| `performance/student-3/baseline-60-2.json` | Baseline run 2 summary |
| `performance/student-3/concurrent-60-1.json` | Concurrent run 1 summary |
| `performance/student-3/concurrent-60-2.json` | Concurrent run 2 summary |
