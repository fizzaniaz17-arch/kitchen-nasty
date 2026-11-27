# Student 3 Performance Report

## Scope

The selected operation is the public reservation availability endpoint:
`GET /api/reservations/availability`. This endpoint checks active tables and
existing reservations for the requested location/date/party size and returns
time slots. The test is read-only and does not create permanent reservations.

## Configuration and thresholds

The k6 script is `performance/student-3/reservation-load-test.js`.

- Baseline: 1 virtual user, 60 seconds, two separate executions.
- Concurrent: 5 virtual users, 60 seconds, two separate executions.
- Project-defined thresholds: request failure rate below 1%; p95 response
  time below 800 ms.
- The thresholds are project targets, not assignment-prescribed values.

## Results

The host `k6` command was unavailable, so the official `grafana/k6` Docker
image was used. Each constant-VU run held its target VU count for at least 60
seconds; no separate ramp stage was configured. The 5-VU workload used a
10-second per-VU pacing interval to remain below the API's request limit.

| Run | VUs | Requests | Avg (ms) | Median (ms) | p95 (ms) | Failed rate | Throughput (req/s) | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Baseline 1 | 1 | 13 | 28.37 | 23.22 | 58.97 | 0% | 0.215 | Pass |
| Baseline 2 | 1 | 13 | 27.59 | 20.75 | 58.72 | 0% | 0.215 | Pass |
| Concurrent 1 | 5 | 31 | 49.39 | 25.81 | 166.06 | 0% | 0.512 | Pass |
| Concurrent 2 | 5 | 31 | 50.42 | 37.03 | 129.47 | 0% | 0.512 | Pass |

The configured project thresholds were met in all four runs: HTTP request
failure rate below 1% and p95 below 800 ms. Each run lasted approximately
60 seconds; each summary is saved under `performance/student-3/` with a
`-60-` suffix. The earlier 30-second runs are retained as preliminary
measurements, not used to satisfy the duration requirement.

An initial unpaced exploratory run was deliberately not counted among the
four final executions: it made 5,205 requests in 30 seconds from one VU and
received 88 HTTP errors due to the repository's 100-requests-per-15-minute
rate limiter. Earlier 30-second runs used 5-second pacing; the final 5-VU
60-second runs use 10-second pacing. The API process was restarted between
the initial exploration and recorded runs to reset its in-memory limiter.
All recorded runs stayed below the limit and made no database writes.

## Metrics to report

The JSON summaries capture average and median duration, p95 duration,
failure rate, requests/second, total requests, duration, and VUs.

## Limitations

The chosen availability endpoint is read-only and exercises reservation
availability logic but does not measure reservation creation or table
assignment writes. The single seeded test location and local Docker database
represent a controlled development environment, not production capacity.
