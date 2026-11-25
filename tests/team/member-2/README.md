# Member 2 reservation API work

All commands below are from the repository root in PowerShell. This uses a separate Compose project, loopback port, database and volume. Do not use a real or shared database. It does not use the repository's regular `kitchenasty-db` container.

```powershell
$env:MEMBER2_DB_PASSWORD = ([pscredential]::new('member2', (Read-Host 'Disposable PostgreSQL password' -AsSecureString))).GetNetworkCredential().Password
if ([string]::IsNullOrEmpty($env:MEMBER2_DB_PASSWORD)) { throw 'A test database password is required.' }
$env:DATABASE_URL = 'postgresql://member2:{0}@127.0.0.1:55432/kitchenasty_member2_test' -f [uri]::EscapeDataString($env:MEMBER2_DB_PASSWORD)
docker compose -p kitchenasty-member2 -f tests/team/member-2/compose.test.yml up -d --wait postgres
npm.cmd ci --no-audit --no-fund
npx.cmd prisma generate --schema prisma/schema.prisma
npx.cmd prisma migrate deploy --schema prisma/schema.prisma
node tests/team/member-2/generate-ep-bva.mjs
node --test tests/team/member-2/generator.test.mjs
node tests/team/member-2/demo-constraints.mjs
Push-Location packages/server
npx.cmd vitest run --config vitest.member2.config.ts --reporter=verbose --reporter=json --outputFile.json=../../docs/sqe/member-2/evidence/my-new-api-run.json
Pop-Location
node tests/team/member-2/audit-generated-coverage.mjs docs/sqe/member-2/evidence/my-new-api-run.json docs/sqe/member-2/evidence/my-new-audit.json
npm.cmd run test:member1
Remove-Item Env:MEMBER2_DB_PASSWORD, Env:DATABASE_URL
```

The test harness checks the host, port, database name, and user before creating its Prisma client. It creates unique synthetic customer and location IDs, deletes only its own fixtures, and resets its own table between cases. Do not point that URL at a database with valuable data. For an existing Member 2 volume, enter its current PostgreSQL password. A new volume uses the password supplied at initialization. The prompt accepts the raw password, and only the URL copy is percent-encoded. For a local run the Vitest config generates a fresh signing secret for its workers and their child processes. CI supplies a fresh value for the same run through MEMBER2_JWT_SECRET.

The generator derives body, path and query cases from the scoped spec. Its output is consumed by database-backed HTTP tests; selected documented JSON responses are validated against OpenAPI response schemas using AJV. For pagination, the `x-clamp-boundaries` extension records observed parsing and clamping thresholds rather than falsely describing 51 as an invalid HTTP input; `x-business-boundaries` records the separate business basis. Schema validity is separate from cross-record rule validity. The demonstration writes and changes a temporary spec file, runs the generator CLI on baseline and changed constraints, restores and regenerates the temporary file, and checks hashes. It leaves application rules and the checked-in spec unchanged and writes a new evidence file for each run. The current full suite is expected to fail because it includes genuine, unresolved business-rule regressions; see `docs/sqe/member-2/` for actual runs, defects and remaining coverage.

Use new evidence filenames for each run. The audit checks each generated ID appears exactly once; it does not prove all real-world equivalence classes were identified. The API command returns a nonzero exit code while documented requirement failures remain.

For the audit closeout, exact CI-style commands, results and evidence index, see [Member 2 status](../../../docs/sqe/member-2/status.md).
