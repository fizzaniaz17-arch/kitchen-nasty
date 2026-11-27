# Member 2 change manifest

Team baseline `6dbae760f9763740ff7f569eca3a981021c18e5d`. All paths below are relative to the repository root. Git reports 33 added and 2 modified paths; zero deletions. The independent review ZIP is the comparison point for the audit column.

| Git | Audit change | Path |
|---|---|---|
| Added | New | `.github/workflows/member2-api.yml` |
| Added | Revised | `docs/sqe/member-2/ai-use-log.md` |
| Added | New | `docs/sqe/member-2/ci-coordination.md` |
| Added | Revised | `docs/sqe/member-2/defects.md` |
| Added | Revised | `docs/sqe/member-2/endpoint-map.md` |
| Added | Revised | `docs/sqe/member-2/ep-bva-and-traceability.md` |
| Added | New | `docs/sqe/member-2/evidence/.gitignore` |
| Added | Unchanged | `docs/sqe/member-2/evidence/api-expanded-run.txt` |
| Added | Unchanged | `docs/sqe/member-2/evidence/api-matrix-full.txt` |
| Added | Unchanged | `docs/sqe/member-2/evidence/api-matrix-results.json` |
| Added | New | `docs/sqe/member-2/evidence/audit-final-constraints.json` |
| Added | New | `docs/sqe/member-2/evidence/audit-final-full.txt` |
| Added | New | `docs/sqe/member-2/evidence/audit-final-generated.json` |
| Added | New | `docs/sqe/member-2/evidence/audit-final-generator.txt` |
| Added | New | `docs/sqe/member-2/evidence/audit-final-results.json` |
| Added | Unchanged | `docs/sqe/member-2/evidence/generated-coverage-matrix.json` |
| Added | New | `docs/sqe/member-2/evidence/post-audit-integration.txt` |
| Added | New | `docs/sqe/member-2/evidence/post-audit-member1.txt` |
| Added | Revised | `docs/sqe/member-2/files-changed.md` |
| Added | Revised | `docs/sqe/member-2/generator-and-rubric.md` |
| Added | Revised | `docs/sqe/member-2/status-codes-and-transitions.md` |
| Added | Revised | `docs/sqe/member-2/status.md` |
| Modified | Unchanged | `package-lock.json` |
| Modified | Revised | `packages/server/package.json` |
| Added | Revised | `packages/server/src/__tests__/team/member-2/reservations.db.member2.ts` |
| Added | Revised | `packages/server/vitest.member2.config.ts` |
| Added | Revised | `tests/team/member-2/README.md` |
| Added | Revised | `tests/team/member-2/audit-generated-coverage.mjs` |
| Added | Revised | `tests/team/member-2/compose.test.yml` |
| Added | Unchanged | `tests/team/member-2/demo-constraints.mjs` |
| Added | Revised | `tests/team/member-2/generate-ep-bva.mjs` |
| Added | Revised | `tests/team/member-2/generated/ep-bva-cases.json` |
| Added | Revised | `tests/team/member-2/generator.test.mjs` |
| Added | Revised | `tests/team/member-2/reservations.openapi.json` |
| Added | Unchanged | `tests/team/member-2/unknown-table-probe.ts` |

The two tracked JSON files each differ from HEAD by two dependency lines. The server manifest is now LF on disk. The remaining original files excluded from the proposal are intermediate evidence entries named in `evidence/.gitignore`; their original bytes remain in the private workspace and review ZIP. No production or teammate paths were edited.

## Pre-commit configuration revision

The final independent review includes the local hashes before this revision. Four configuration or setup files and this manifest changed afterward. The other 30 proposed files, including the assertions and original execution evidence, retain their reviewed SHA-256 values.

| Path | Updated local SHA-256 |
|---|---|
| `.github/workflows/member2-api.yml` | `e44e786c7ccb56a81e51e2dd51513e29577ce6a45cd6d5cb62ccc7b45262bf5c` |
| `packages/server/vitest.member2.config.ts` | `ed012b808e2afefed4271eb282be97eae754242c29b3505afe45988e6aeba30a` |
| `tests/team/member-2/README.md` | `bfe5a716bee6dd3725a4ead01f711dc5f89ac4d83386a6e584f1b63ccb05053d` |
| `tests/team/member-2/compose.test.yml` | `db708e1488aa0669f321ecf119b857114fc78f41ee27747af05e3bb2db10a3ea` |

Compose requires MEMBER2_DB_PASSWORD. The PowerShell instructions encode the password in the connection URL. Vitest generates a run-scoped JWT secret locally; the CI test step supplies a fresh random value. The rerun against the existing isolated database reproduced all 382 prior outcomes, including the same 36 failures. All 296 generated cases ran once. Generator checks passed 5/5, Member 1 passed 59/59, and the four existing integration suites passed 75/75.

### Accepted evidence whitespace

The author approved preserving one final blank line in each original terminal log. The exceptions apply only to the following two findings from Git's whitespace check.

| Original evidence | Finding | Reviewed SHA-256 |
|---|---|---|
| `evidence/post-audit-member1.txt` | New blank line at EOF, line 17 | `e4147e155286c5181537729a3d263b3e4e49039126859a47eb14536339ddc6dd` |
| `evidence/post-audit-integration.txt` | New blank line at EOF, line 9 | `08380a1db71e73a07ab4f51001acdea1b793d0a183d2ec94ba5fe66626396a26` |

The staged check excludes exactly these two paths. The full staged check must still report only the two findings above. The original bytes are checked against the independent review manifest.
