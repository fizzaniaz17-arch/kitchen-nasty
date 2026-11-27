# Member 2 audit closeout

Branch `sqe/member2-api-testing`, team baseline `6dbae760f9763740ff7f569eca3a981021c18e5d`. The updated reservation/table suite ran against PostgreSQL 16 on the dedicated loopback port 55432. The suite returned exit 1. No release or merge sign-off is warranted.

| Local check | Result | Evidence |
|---|---|---|
| Final Member 2 API suite | 382 executed, 346 passed, 36 failed, zero skipped | [Vitest JSON](evidence/audit-final-results.json), [verbose output and database observations](evidence/audit-final-full.txt) |
| Pre-audit Member 2 suite | 372 executed, 339 passed, 33 failed. All 33 full test names also failed in the final report | [original JSON](evidence/api-matrix-results.json), [original log](evidence/api-matrix-full.txt) |
| Generator checks and case consumption | 5/5 unit tests passed. All 296 generated IDs executed once, 279 passed and 17 failed | [unit output](evidence/audit-final-generator.txt), [exact-ID audit](evidence/audit-final-generated.json) |
| Regeneration after two spec changes | Party maximum 50 to 40, capacity minimum 1 to 2. Both boundary triplets shifted and the original output and spec hash were recovered | [actual before/after](evidence/audit-final-constraints.json) |
| Member 1 and relevant existing integration tests | 59/59 and 75/75 passed | [Member 1](evidence/post-audit-member1.txt), [reservation, ownership, table and location](evidence/post-audit-integration.txt) |
| Install, database and type checks | npm clean install succeeded (1,468 packages). Prisma client generation succeeded, seven migrations present, none pending, server TypeScript exit 0 | Reproduction commands below |
| CI discovery | Default server discovery listed 29 files, dedicated config listed only the Member 2 suite. New workflow YAML parsed locally | [CI handoff and remaining hosted checks](ci-coordination.md) |

The three additional failures were the documented occupied and free time lookups and HTTP 500 on a malformed path ID. The two time cases establish a guide/controller mismatch. Selection of the public contract needs team review. The original 33 comprise 13 lifecycle, eight calendar/clock, six query-timeout and six duplicate/assignment requirements. See the [failure-by-test register](defects.md).

### Reproduction

Use [the PowerShell setup and database guard](../../../tests/team/member-2/README.md) from the repository root. Use fresh evidence filenames on each run. Local platform was Windows, Node 24.14.0, npm 11.9.0, Prisma 5.22.0 and Vitest 4.1.12. The proposed hosted job uses Ubuntu and Node 22.

```powershell
npm.cmd ci --no-audit --no-fund
npx.cmd -w packages/server prisma generate --schema ../../prisma/schema.prisma
# Set DATABASE_URL for the dedicated loopback DB as in the linked README.
npx.cmd -w packages/server prisma migrate deploy --schema ../../prisma/schema.prisma
npx.cmd -w packages/server tsc --noEmit
npx.cmd -w packages/server vitest list --filesOnly
npx.cmd -w packages/server vitest list --filesOnly --config vitest.member2.config.ts
node tests/team/member-2/generate-ep-bva.mjs
node --test tests/team/member-2/generator.test.mjs
node tests/team/member-2/demo-constraints.mjs docs/sqe/member-2/evidence/my-new-constraints.json
cmd /d /c "npx.cmd -w packages/server vitest run --config vitest.member2.config.ts --reporter=verbose --reporter=json --outputFile.json=../../docs/sqe/member-2/evidence/my-new-run.json > docs/sqe/member-2/evidence/my-new-run.txt 2>&1"
node tests/team/member-2/audit-generated-coverage.mjs docs/sqe/member-2/evidence/my-new-run.json docs/sqe/member-2/evidence/my-new-coverage.json
npm.cmd run test:member1
npx.cmd -w packages/server vitest run src/__tests__/integration/reservation.test.ts src/__tests__/integration/reservation-idor.regression.test.ts src/__tests__/integration/table.test.ts src/__tests__/integration/location.test.ts
```

### Evidence retained

All 58 pre-audit raw files were compared byte-for-byte with the independent review ZIP. The original full log, JSON, [generated audit](evidence/generated-coverage-matrix.json) and [earlier fixture failure](evidence/api-expanded-run.txt) remain in the proposed change set. Other intermediate files are retained locally under their original paths and explicitly listed in the evidence directory?s ignore file. The original review ZIP stays in the parent project folder.

### Outstanding decisions and shared work

Member 1 and the repository owner still need to review the hosted check and choose the required-check setting. Team triage must decide the availability contract, retry identity, and completed-to-cancelled semantics. The child-process probes establish a local 1.5-second deadline observation. Deployment behavior has not been measured. The team still owns shared issue tracking, root-cause exercises, risk and release sign-off, individual browser scenarios and human verification of AI-assisted work. The scoped data and contracts cover the named partitions; concurrency, deployment-specific parsing and exhaustive input combinations were not tested.
