# Student 3 — Performance Test Environment

## Hardware and Software

| Component | Detail |
|---|---|
| Operating System | Windows (local development workstation) |
| Node.js | v22.23.0 |
| npm | 10.9.8 |
| Docker | 29.8.2 (Docker Desktop for Windows) |
| k6 | Grafana k6 OSS via `grafana/k6` Docker image |

## Application Under Test

| Component | Detail |
|---|---|
| Application | KitchenAsty v0.3.2 |
| Commit | `d6af7237e9569ebeab19ccab375362f9d144e25e` |
| API Server | Express on `http://localhost:3000` |
| Database | PostgreSQL 16 via Docker Compose on port 5432 |
| Database Volume | `kitchenasty_pgdata` Docker volume |

## Seed Data

| Entity | Count |
|---|---|
| Locations | 1 (downtown) |
| Tables | 10 (Table 1–10) |
| Staff accounts | 1 (seeded admin) |
| Customer accounts | 1 (seeded customer) |
| Existing reservations | Sparse (seeded data only) |

## Network Configuration

| Component | Network Path |
|---|---|
| k6 Docker → API | `http://host.docker.internal:3000` |
| API → PostgreSQL | `localhost:5432` (Docker host network) |
| All traffic | Local loopback; no external network hops |

## Rate Limiting

The API has a global rate limiter configured at 100 requests per 15 minutes. The
limiter uses an in-memory counter that resets when the API process restarts. Test
pacing was configured to stay below this limit during recorded runs.

## Limitations

1. All components (k6, API, database) run on the same physical machine, sharing
   CPU and I/O resources. This is not representative of production deployment.
2. The database contains minimal seed data. Production performance with thousands
   of reservations and tables would differ.
3. Docker networking introduces slight latency compared to native host execution.
4. No other significant processes were controlled during testing.
