# Student 3 Performance Evaluation

## Objective

Evaluate application response behavior under a controlled load and compare single-user execution with concurrent-user execution.

## Executed test setup

The script targets only the local `/api/health` endpoint. This endpoint is
excluded from the Express rate limiter, so the measurements do not mix
application latency with an expected `429` response. The API was listening on
the local Wi-Fi interface and PostgreSQL was isolated on port 55433.

Script: `evidence/performance/k6-api.js`

| Scenario | Duration | Virtual users | Runs |
|---|---:|---:|---:|
| Single | 15 s | 1 | 2 |
| Concurrent | 20 s | 5 | 2 |

## Measured results

| Run | Avg ms | Median ms | p90 ms | p95 ms | Max ms | RPS | Failed % | Total requests |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Single 1 | 5.89 | 5.85 | 8.24 | 8.50 | 8.76 | 0.9921 | 0 | 15 |
| Single 2 | 5.97 | 4.75 | 12.22 | 13.26 | 13.45 | 0.9930 | 0 | 15 |
| Concurrent 1 | 8.31 | 4.91 | 20.23 | 22.37 | 52.28 | 4.9351 | 0 | 100 |
| Concurrent 2 | 6.84 | 5.55 | 13.32 | 17.48 | 20.60 | 4.9483 | 0 | 100 |

The console summaries and raw metric JSON are retained under
`evidence/performance/`. The per-run `*-summary.json` files contain the
machine-readable k6 metrics; the matching `*-console.txt` files preserve the
terminal summaries.

## Rate-limiter observation

An earlier exploratory run that also called `/api/locations` reached the
API-wide limiter and received `429` responses: 25/190 requests failed in
Concurrent 1 and 100/200 in Concurrent 2. Those results are not presented as
application latency measurements. `/api/health` final reruns passed with 0%
failed requests.

## Conclusion

No assignment-specific performance threshold was provided. The report records
measured local response behavior without claiming a target pass or production
readiness.
