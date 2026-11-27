# Member 2 Playwright results

Final run began 2026-11-25T14:42:05.542Z against base commit cacae50a562c2b1668153a6f4d87192449c49f0a with the uncommitted Member 2 E2E files. Windows, Node 24.14.0, Playwright 1.58.2, installed Chrome, PostgreSQL 16 Alpine. The suite ran serially on a fresh tmpfs-backed kitchenasty_member2_e2e database. All seven migrations applied. Dates A and B were 2026-12-02 and 2026-12-03. Both temporary containers from the two executions were removed.

**Final result: 8 passed, 2 failed, 0 skipped, 0 flaky, 0 retries.** Playwright returned exit 1 in 35.3 seconds. The earlier execution also had 8 passes and the same two failures. The final run used each frontend's own working directory to load its Tailwind configuration and checked the selected slot's computed background color.

| Flow | Result | Availability GET or status PATCH | PostgreSQL status before and after |
|---|---|---|---|
| UC-M2-01-ALT-01 | passed | 200 / 200 | CONFIRMED -> CONFIRMED |
| UC-M2-01-ALT-02 | passed | 200 / 200 | CONFIRMED -> CONFIRMED |
| UC-M2-01-EX-01 | passed | 200 | CONFIRMED -> CONFIRMED |
| UC-M2-01-EX-02 | passed | 200 | CONFIRMED -> CONFIRMED |
| UC-M2-01-MAIN | passed | 200 | CONFIRMED -> CONFIRMED |
| UC-M2-02-ALT-01 | passed | 200 | PENDING -> CANCELLED |
| UC-M2-02-ALT-02 | passed | 200 | CONFIRMED -> CANCELLED |
| UC-M2-02-EX-01 | failed | 200 | PENDING -> COMPLETED |
| UC-M2-02-EX-02 | failed | 200 | CANCELLED -> CONFIRMED |
| UC-M2-02-MAIN | passed | 200 / 200 / 200 | PENDING -> COMPLETED |

All five customer searches preserved the complete fixture reservation and table snapshots. For five guests the real HTTP 200 response had zero eligible tables and 22 unavailable slots. After loading, the browser rendered all 22 disabled. Clearing the date removed the buttons and generated no empty-date lookup. For the staff main flow, all three PATCH responses carried the same seeded reservation ID, the row badge followed each change, and separate database reads confirmed CONFIRMED, SEATED, then COMPLETED.

### Failed requirements

- **UC-M2-02-EX-01** attempted PENDING to COMPLETED from detail. Expected a prevented action or visible 4xx rejection with PENDING preserved. Actual HTTP 200 returned COMPLETED for the fixture ID. The detail badge, its value after reload, and the stored row were all COMPLETED.
- **UC-M2-02-EX-02** attempted CANCELLED to CONFIRMED. Under the proposed terminal-state rule, the original row should remain CANCELLED. Actual HTTP 200 returned CONFIRMED for the fixture ID. The badge before and after reload and PostgreSQL all showed CONFIRMED.

Both findings corroborate existing API defect M2-D04. The detail page enables every other status, and the update controller accepts enum values without checking a transition map. The CANCELLED-terminal interpretation needs team confirmation. COMPLETED to CANCELLED was outside this run.

### Evidence and reproduction

Use the command in README.md. The untouched raw results, ten screenshots, ten original traces, per-test fixture snapshots, and migration log are in the local directory **test-results/member2-e2e/2026-11-25T14-41-57.081Z/**. The console log is alongside that directory. Output under test-results is Git-ignored. The standalone **Member2_Playwright_Evidence.zip** in the parent SQE Project folder contains raw JSON, console and migration outputs, screenshots and observations grouped by flow ID, both failure contexts, and review copies of all traces. Synthetic JWTs in the review traces are redacted. The archive manifest gives the original and included digests. Keep the private original traces local.

The API suite and its evidence are unchanged from the base commit. The 36 API failures were not rerun or included in the browser counts. This run covers Chromium on the local Windows environment.
