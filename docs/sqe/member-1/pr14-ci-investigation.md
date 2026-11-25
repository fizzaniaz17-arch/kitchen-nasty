# Member 1 PR #14 CI Investigation & Playwright Fix

**Date:** 25 November 2026  
**Branch:** `fix/member1-pr14-ci` (branched from `origin/main` at `6dbae760f9763740ff7f569eca3a981021c18e5d`)  
**Repository:** `https://github.com/fizzaniaz17-arch/kitchen-nasty`

---

## 1. Exact Files Changed

1. `e2e/storefront/member1-reservation.spec.ts` — Fixed the `/api/auth/me` mocked response shape and added explicit `toBeEnabled()` assertions on the `Book Table` button before clicking in the four authenticated test cases.
2. `docs/sqe/member-1/pr14-ci-investigation.md` — This investigation and verification report.

No production code, SonarCloud settings, workflow files, or Member 2 files/branches (`sqe/member2-api-testing` / PR #14) were modified.

---

## 2. Task 1 — Playwright Storefront Auth Fixture Fix

### Root Cause

In `packages/storefront/src/context/AuthContext.tsx` (lines 47–48):

```ts
const authenticatedUser = data.data?.customer ?? data.data?.user;
if (!authenticatedUser) throw new Error('Invalid user response');
```

In `e2e/storefront/member1-reservation.spec.ts` (line 9), the `setup()` helper previously mocked `/api/auth/me` as:

```ts
await page.route('**/api/auth/me', (route) => route.fulfill({ json: { success: true, data: customer } }));
```

Because `data` contained the customer fields directly rather than `{ customer }`, `AuthContext` evaluated `authenticatedUser` as `undefined`, threw `'Invalid user response'`, and called `logout()`. That left the customer unauthenticated and the `Book Table` submit button `disabled`, causing all four click-based storefront tests (`UC-M1-01-MAIN`, `UC-M1-01-ALT-01`, `UC-M1-01-EX-01`, `UC-M1-01-EX-02`) to time out after 30s.

### Fix Applied

Updated `e2e/storefront/member1-reservation.spec.ts`:
- Line 9: changed `{ success: true, data: customer }` to `{ success: true, data: { customer } }` to match `AuthContext.tsx`.
- Lines 37, 49, 65, 74: added `await expect(page.getByRole('button', { name: 'Book Table' })).toBeEnabled();` before `.click()` in all four authenticated booking tests.

### Before / After Test Results

| Run | Command | Result | Details |
|---|---|---|---|
| **Before fix** (storefront) | `npx playwright test e2e/storefront/member1-reservation.spec.ts --config playwright.member1.config.ts --project=member1-storefront` | **4 failed, 1 passed** (2.9m) | `UC-M1-01-MAIN`, `UC-M1-01-ALT-01`, `UC-M1-01-EX-01`, `UC-M1-01-EX-02` timed out at 30s waiting for disabled `Book Table` button; `UC-M1-01-ALT-02` passed. |
| **After fix** (all 10 Member 1 flows) | `npm run test:e2e:member1` | **10 passed** (1.6m) | All 5 `member1-storefront` tests and all 5 `member1-admin` tests passed. |

*Note:* The full general Playwright config (`playwright.config.ts`) starts `npm run dev:server` against PostgreSQL on `http://localhost:3000/api/health`, which was not started in this isolated local worktree; CI will execute the full general E2E suite once this fix is integrated.

---

## 3. Task 2 — SonarCloud PR #14 Security Quality Gate Investigation

Queried SonarCloud directly via:
- `https://sonarcloud.io/api/qualitygates/project_status?projectKey=fizzaniaz17-arch_kitchen-nasty&pullRequest=14`
- `https://sonarcloud.io/api/issues/search?componentKeys=fizzaniaz17-arch_kitchen-nasty&pullRequest=14&resolved=false&ps=100`

### Quality Gate Status

- **Status:** `ERROR` (`new_security_rating` = `3` / **C**, threshold `1` / **A**).
- **Other conditions:** `new_reliability_rating` = A (OK), `new_maintainability_rating` = A (OK), `new_duplicated_lines_density` = 0.0% (OK), `new_security_hotspots_reviewed` = 100.0% (OK).

### Exact Security Issues (5 Total — All in Member 2's Workflow File)

All 5 open vulnerabilities on PR #14 are in **`.github/workflows/member2-api.yml`** (added on `sqe/member2-api-testing`):

| # | Rule | Severity | File & Line | Message / Cause |
|---|---|---|---|---|
| 1 | `yaml:S2068` | MAJOR (Security: Medium) | `.github/workflows/member2-api.yml:22` | `"PASSWORD" detected here, make sure this is not a hard-coded credential.` (`POSTGRES_PASSWORD: ci-${{ github.run_id }}-${{ github.run_attempt }}`) |
| 2 | `githubactions:S6505` | MAJOR (Security: Medium) | `.github/workflows/member2-api.yml:36` | `Omitting "--ignore-scripts" allows lifecycle scripts to run during package installation.` (`- run: npm ci`) |
| 3 | `githubactions:S6505` | MAJOR (Security: Medium) | `.github/workflows/member2-api.yml:37` | `"npx" can install packages on-demand and run their lifecycle scripts.` (`- run: npx -w packages/server prisma generate ...`) |
| 4 | `githubactions:S6505` | MAJOR (Security: Medium) | `.github/workflows/member2-api.yml:38` | `"npx" can install packages on-demand and run their lifecycle scripts.` (`- run: npx -w packages/server prisma migrate deploy ...`) |
| 5 | `githubactions:S6505` | MAJOR (Security: Medium) | `.github/workflows/member2-api.yml:53` | `"npx" can install packages on-demand and run their lifecycle scripts.` (`npx -w packages/server vitest run ...`) |

### Ownership & Remediation Guidance

- **None** of the SonarCloud Security Rating C findings are in Member 1's code.
- **Responsible member:** **Member 2** (`.github/workflows/member2-api.yml` on `sqe/member2-api-testing` in PR #14).
- **Recommended coordination with Member 2:**
  - For `S6505`: use `npm ci --ignore-scripts` (if postinstall scripts are not required, or handle Prisma generation explicitly) and replace `npx -w packages/server ...` with `npm exec --no -w packages/server -- ...` or `./node_modules/.bin/...` so `npx` cannot download packages on demand.
  - For `S2068`: generate the ephemeral CI Postgres password in a masked step or pass it via an environment variable / GitHub secret rather than an inline `POSTGRES_PASSWORD:` literal containing `ci-...` in YAML.

---

## 4. Remaining Failures & Preserved Team Work

- **Member 2 API suite (PR #14):** 346 passed / 36 documented requirement failures remain untouched on `sqe/member2-api-testing`.
- **Member 2 E2E suite (`tests/team/member-2/e2e/`):** Untouched (8 passed / 2 failed locally per handoff).
- **SonarCloud PR #14 gate:** Still red until Member 2 updates `.github/workflows/member2-api.yml` on `sqe/member2-api-testing`.

---

## 5. Recommended Next Steps

1. Review and merge `fix/member1-pr14-ci` into `main` (or cherry-pick into `main`) to resolve the 4 Member 1 storefront Playwright failures in General CI.
2. Coordinate with Member 2 to address the 5 SonarCloud findings in `.github/workflows/member2-api.yml` on `sqe/member2-api-testing` so PR #14's SonarCloud Security Rating returns to `A`.
3. Re-run General CI and Member 1 Quality Gates after integration to confirm green status on those checks.
