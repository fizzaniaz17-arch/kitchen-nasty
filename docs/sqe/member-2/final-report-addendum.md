# Member 2 SQE report and submission handoff

This addendum is a review-branch snapshot, not a claim that unresolved work has been released. It complements the existing Member 2 documents and preserves the Member 1 and Member 3 reports.

## Workflows and test basis

Customer checks availability and creates a reservation; staff processes the same reservation and table association. The persistent shared identity and state are verified through HTTP and PostgreSQL. The initial basis is the [team reservation test basis](../member-1/test-basis.md), feature documentation, and scoped [OpenAPI](../../../tests/team/member-2/reservations.openapi.json). Requirements that conflict or await agreement are in [final contract decisions](final-contract-decisions.md).

## API, EP, BVA and generator

The [endpoint/input matrix](ep-bva-and-traceability.md) maps applicable body, query, path, authorization and workflow inputs to valid/invalid equivalence classes and three-point boundaries. Inputs without a real documented bound do not receive an invented maximum. The deterministic [generator](../../../tests/team/member-2/generate-ep-bva.mjs) reads the scoped specification; PostgreSQL tests consume its cases, and [the audit](../../../tests/team/member-2/audit-generated-coverage.mjs) checks each generated identity. The [generator and rubric report](generator-and-rubric.md) and [README](../../../tests/team/member-2/README.md) explain the two-constraint regeneration and reproducible commands. Latest run: 5/5 generator checks and 296/296 cases accounted once; the two formerly failing availability cases pass under the approved combined response contract. The fresh temporary-constraint demonstration is saved outside the repository with current local verification evidence.

## Persistence, authorization and browser flows

Tests use a dedicated synthetic PostgreSQL environment, read the same reservation after create/update and after rejected operations, and distinguish customer and staff authorization. Issue #20 adds 14 real PostgreSQL conflict cases, including explicit table-lock contention and reactivation races. Ten Member 2 Playwright flows cover availability and staff lifecycle; the previous Issue #20 run was 8 passed and 2 known lifecycle exceptions failed; after approved lifecycle enforcement a new run passed 10/10. See [browser results](../../../tests/team/member-2/e2e/RESULTS.md) for the earlier preserved baseline and local verification artifacts for later runs.

## Defects, risks and analysis

The [original defect register](defects.md) links all ten issue groups and historical raw evidence. The [current analysis and release decision](defect-analysis-and-release.md) distinguishes provisional fixes, limitations, two five-whys/fishbone analyses and an explicitly group-based Pareto chart. Risk IDs R-P01/R-P02/R-P03/R-P05 refer to the shared register; M2-R01 and M2-R02 remain proposed. After the user reported team approval, the prior 455-test baseline (438 passed/17 failed) was reconciled: the obsolete conflict characterization and the old cancelled-reopening characterization were changed to assert the approved rules while prior evidence was preserved. A subsequent local run recorded 464/464 API tests and 296/296 generated cases; review full identity comparison and current logs before release.

## Verification and AI disclosure

On this working candidate, the transaction-aware Member 1 fixtures and expanded tests produced 123/123 passing with 100% statements, branches, functions and lines; existing integration passed 344/344; server TypeScript and the full project build passed. After the logging correction, the API suite was rerun using a fresh tmpfs PostgreSQL container on a separate IPv6 loopback binding: 464/464 passed and 296/296 generated cases executed once. An earlier attempt using an ephemeral port was rejected by the test suite safety guard before any tests ran; its output is retained. Stryker scored 71.01% against the unchanged 60% gate: 729 killed, one timeout and 298 survived; the full machine-readable mutation report is retained in the local phase-5 evidence. Historical test evidence is preserved outside the repository as well as in the original evidence index. Hosted checks and Sonar must be verified on the actual committed integration candidate; none is claimed here.

Codex was used for investigation, code/test changes, documentation, review and running local verification, under human direction. The human must verify requirements, approve final decisions, review the contributions and record their own review; no unperformed human validation is claimed. See the existing AI-use record and retained conversation for earlier work.

## Security and changed expectations

The shared structured logger now redacts authorization, cookie, idempotency-key and set-cookie headers; a synthetic request through the actual HTTP middleware confirmed the redactions. The previous no-key duplicate expectation now supplies the approved optional key, while no-key separate bookings remain valid. The conflicting-assignment and cancelled-reopening characterizations now assert the approved rules. The previously documented occupied-time 400 expectation was replaced with the approved 200 response and available=false. Generated status cases use a valid source state for each target. Historical results are retained.

## Release and group handoff

**Recommendation: HOLD.** Merge only after final business decisions, reviewed authorship, all required gates or formally authorized exceptions, hosted CI/Sonar, and no unexpected regressions. Pending work: review the reported team decisions and idempotency persistence, retention, client adoption and timezone details; verify the stacked PRs against current main; review #18-#27 and risks; coordinate team review and submission. The Member 2 contributor should be able to demonstrate EP classes, three-point bounds, the OpenAPI generator and two-constraint regeneration, persisted-state assertions, concurrency evidence, actual failures and AI use in the viva.

## Group submission checklist

- [x] Preserve original API, browser and defect evidence; retain owner attribution for existing commits.
- [x] Map API inputs, EP/BVA and generated cases; retain the two-constraint demonstration.
- [x] Document current contract proposals, unresolved risks, RCA and distinct-group Pareto method.
- [x] Record user-reported team decisions on lifecycle, occupancy, availability, optional retry identity and date-format policy.
- [ ] Review idempotency persistence/retention and deployment timezone implications with the team.
- [x] Reconcile obsolete characterizations after reported approval; preserve historical evidence and rerun API/browser tests.
- [ ] Review Member 1 fixture/test contributions and verify mutation and hosted gates on the actual integration head.
- [ ] Reconcile the PR stack with current main without overwriting teammate contributions; review and merge only after mandatory conditions pass.
- [ ] Complete human review, AI-use disclosure, final group report and Member 2 viva preparation.
