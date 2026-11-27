# Student 3 Performance Evaluation

## Objective

Evaluate application response behavior under a controlled load and compare single-user execution with concurrent-user execution.

## Evidence review

The Student 3 report directory and tracked repository files were reviewed for k6 scripts and performance test results.

No k6 test script or verified performance result was found in the reviewed evidence.

Consequently, no response-time percentile, throughput, error rate, or load-test improvement is claimed.

## Required performance test plan

The intended evaluation should include:

| Scenario | Virtual users | Runs |
|---|---:|---:|
| Baseline | 1 | 2 |
| Concurrent load | 5 or more | 2 |

The same representative application endpoint should be used for comparable runs. Each run should record:

- Request count and throughput.
- Average response time.
- Median response time.
- 90th and 95th percentile response times.
- Failed request count and error rate.
- Test duration and environment.

## Conclusion

Performance testing with k6 is not evidenced in the current Student 3 deliverables. Results must be collected before making performance or scalability claims.
