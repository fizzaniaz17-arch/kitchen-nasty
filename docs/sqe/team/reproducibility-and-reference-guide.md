# KitchenAsty SQE — Reproducibility, Tooling, CI & PR Reference Guide

**Team Repository:** https://github.com/fizzaniaz17-arch/kitchen-nasty  
**Primary Documentation Branch:** `final-audit`  
**Final Integration PR:** https://github.com/fizzaniaz17-arch/kitchen-nasty/pull/32 (`integration/sqe-reservation-final-review`)

---

## 1. Upstream Reference & Baseline Commit

| Item | Reference |
| :--- | :--- |
| **Upstream Repository** | https://github.com/mighty840/kitchenasty |
| **License** | MIT (`LICENSE`) |
| **Exact Upstream Baseline Commit** | `d6af7237e9569ebeab19ccab375362f9d144e25e` (`chore: release 0.3.2 (#63)`) |
| **Team `main` HEAD (Pre-PR #32)** | `9b4ff76b113878d754cfd73e1b5ef04e08cbf9f1` (`Merge pull request #28`) |
| **PR #32 Integration Commit** | `66194b4057c13ea42b78bc693ed631395c3b0355` (`fix(sqe): rely on PostgreSQL ordering for table locks`) |

---

## 2. Reproducible Setup & Reset Instructions

### Initial Setup
```bash
# 1. Clone team repository and checkout target branch
git clone https://github.com/fizzaniaz17-arch/kitchen-nasty.git
cd kitchen-nasty

# 2. Install workspace dependencies
npm install

# 3. Configure environment (PostgreSQL DATABASE_URL and JWT_SECRET required)
# Example: JWT_SECRET must not use known placeholder secrets

# 4. Generate Prisma client & apply PostgreSQL migrations
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy --schema prisma/schema.prisma

# 5. Seed initial data (locations, tables, users, sample reservations)
npm run db:seed -w packages/server

# 6. Start development servers (in separate terminals)
npm run dev:server
npm run dev:storefront
npm run dev:admin
```

### Database Reset
```bash
# Reset PostgreSQL database, re-apply migrations, and re-run seed script
npm run db:reset -w packages/server
```
*(For isolated PostgreSQL 16 test containers used in Member 2 API testing on PR #32, see `tests/team/member-2/compose.test.yml`.)*

---

## 3. Runnable Scripts & Test Data

### Runnable Scripts (`package.json` & `packages/server/package.json`)
| Script | Command | Purpose |
| :--- | :--- | :--- |
| **Lint** | `npm run lint` | ESLint across `packages/*/src` (`.ts`, `.tsx`) |
| **Build** | `npm run build` | Build `shared`, `server`, `admin`, and `storefront` |
| **Unit Tests** | `npm run test:unit` | Vitest unit suites (`shared` + `server`) |
| **Integration Tests** | `npm run test:integration` | Vitest integration suite (`packages/server/src/__tests__/integration`) |
| **Member 1 White-Box** | `npm run test:member1` | Run Member 1 white-box & controller completeness tests |
| **Member 1 Coverage** | `npm run coverage:member1` | Run Member 1 suite with V8 100% statement/branch/function/line gate (`vitest.member1.config.ts`) |
| **Member 1 Mutation** | `npm run mutation:member1` | Run Stryker mutation testing (`stryker.member1.config.json`, 60% break gate) |
| **Member 1 E2E** | `npm run test:e2e:member1` | Run Playwright E2E reservation flows (`playwright.member1.config.ts`) |
| **Full E2E** | `npm run test:e2e` | Run full Playwright suite (`npx playwright test`) |

### Test Files & Test Data Locations
- **Member 1 White-Box Suites:**
  - [`packages/server/src/__tests__/team/member-1/reservation-table.whitebox.test.ts`](../../packages/server/src/__tests__/team/member-1/reservation-table.whitebox.test.ts)
  - [`packages/server/src/__tests__/team/member-1/controller-completeness.test.ts`](../../packages/server/src/__tests__/team/member-1/controller-completeness.test.ts)
  - [`e2e/storefront/member1-reservation.spec.ts`](../../e2e/storefront/member1-reservation.spec.ts)
- **Member 2 OpenAPI Spec & PostgreSQL Suite (on PR #32 / PR #14):**
  - `tests/team/member-2/reservations.openapi.json` (OpenAPI specification driving EP/BVA generation)
  - `packages/server/src/__tests__/team/member-2/reservations.db.member2.ts`
- **Seed Data:** [`prisma/seed.ts`](../../prisma/seed.ts) & [`prisma/schema.prisma`](../../prisma/schema.prisma)
- **SQE Documentation & Evidence:**
  - Member 1: [`docs/sqe/member-1/quality-report.md`](../member-1/quality-report.md), [`mcc-mcdc.md`](../member-1/mcc-mcdc.md), [`mutation-analysis.md`](../member-1/mutation-analysis.md), [`custom-mutations.md`](../member-1/custom-mutations.md), [`finalization-summary.md`](../member-1/finalization-summary.md)
  - Team: [`docs/sqe/team/test-plan.md`](./test-plan.md), [`risk-matrix-and-exit-criteria.md`](./risk-matrix-and-exit-criteria.md), [`traceability-matrix.md`](./traceability-matrix.md), [`weekly-gqm-metrics.md`](./weekly-gqm-metrics.md), [`completion-and-release-recommendation.md`](./completion-and-release-recommendation.md)
  - Student 3: [`docs/sqe/student-3/dependency-audit.md`](../student-3/dependency-audit.md), [`security-remediation.md`](../student-3/security-remediation.md)

---

## 4. Tool Versions (from `package.json` & `packages/server/package.json`)

| Tool / Dependency | Version |
| :--- | :--- |
| **Node.js Types (`@types/node`)** | `^22.0.0` |
| **TypeScript** | `^5.7.0` |
| **Vitest** | `^4.1.12` |
| **V8 Coverage (`@vitest/coverage-v8`)** | `4.1.12` |
| **Stryker Mutator (`@stryker-mutator/core`, `vitest-runner`)** | `9.6.1` |
| **Playwright (`@playwright/test`, `playwright`)** | `^1.58.2` |
| **Prisma & `@prisma/client`** | `^5.22.0` |
| **Express** | `^4.21.0` |
| **Zod** | `^4.6.7` |
| **SonarCloud** | Project `fizzaniaz17-arch_kitchen-nasty` ([`sonar-project.properties`](../../sonar-project.properties)) |

---

## 5. CI Configuration

| Workflow / Config File | Purpose & Gates |
| :--- | :--- |
| [`.github/workflows/member1-quality.yml`](../../.github/workflows/member1-quality.yml) | Runs `Member 1 / 100% Coverage`, `Member 1 / Mutation 60%`, `Member 1 / Custom Mutations` (CM-A & CM-B), `Member 1 / Sonar Quality Gate`, and the required aggregator `Member 1 / Required` (no `continue-on-error` or `\|\| true`). |
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | Runs `Lint`, `Unit Tests`, `Integration Tests`, `E2E Tests`, `Security Audit`, and `Build`. |
| [`.github/workflows/mobile.yml`](../../.github/workflows/mobile.yml) | Builds Android and iOS bundles (`Build Android Bundle`, `Build iOS Bundle`). |
| [`.github/workflows/demo.yml`](../../.github/workflows/demo.yml) & [`docs.yml`](../../.github/workflows/docs.yml) | Demo deployment and documentation site workflows. |
| [`sonar-project.properties`](../../sonar-project.properties) | Defines SonarCloud source/test roots, exclusions, and LCOV coverage paths (`packages/server/coverage/sonar/lcov.info`, `packages/storefront/coverage/sonar/lcov.info`). |
| `.github/workflows/member2-api.yml` *(on PR #32)* | Runs `Member 2 / Reservation API (PostgreSQL)` against Docker PostgreSQL 16. |

---

## 6. Documented Change (Fail-to-Pass PR) & Blocked Pull Request

### A. Documented Change — Fail-to-Pass Fix (**PR #8**)
- **Branch:** `demo/fix-fail-to-pass` → `main` (merged 22 November 2026)
- **Defect:** Past-date reservations were not rejected before database access.
- **Red (Before Fix):** Commit `d405f83` added a failing white-box test expecting HTTP `400` (`Cannot reserve in the past`). Evidence: [`docs/sqe/member-1/evidence/fix-pr-red.txt`](../member-1/evidence/fix-pr-red.txt), [`pr8-member1-red-d405f83.png`](../member-1/screenshots/pr8-member1-red-d405f83.png).
- **Green (After Fix):** Commit `80f720c` added the past-date guard in `createReservation`, turning the test and CI gate green while maintaining 100% branch coverage. Evidence: [`docs/sqe/member-1/evidence/fix-pr-green.txt`](../member-1/evidence/fix-pr-green.txt), [`pr8-member1-green-03d977c.png`](../member-1/screenshots/pr8-member1-green-03d977c.png).

### B. Intentionally Blocked Pull Request (**PR #6**)
- **Branch:** `demo/blocked-party-size-v2` (Commit `1eedc87cd139459b0f053e47d72bddc1f5de2e6c`)
- **Regression:** Controlled change reducing maximum party size from `.max(50)` to `.max(40)`.
- **Pipeline Block Proof:** `Member 1 / Required` failed and repository ruleset enforcement blocked merging. Evidence: [`docs/sqe/member-1/evidence/blocked-pr-red.txt`](../member-1/evidence/blocked-pr-red.txt), [`pr6-member1-blocked-run-1eedc87.png`](../member-1/screenshots/pr6-member1-blocked-run-1eedc87.png).

### C. Final Passing Integration Pull Request (**PR #32**)
- **URL:** https://github.com/fizzaniaz17-arch/kitchen-nasty/pull/32 (`integration/sqe-reservation-final-review`, Commit `66194b4057c13ea42b78bc693ed631395c3b0355`)
- **Result:** All 15 hosted checks **PASSED**, including `Member 1 / Required` (https://github.com/fizzaniaz17-arch/kitchen-nasty/actions/runs/45988707277) and SonarCloud Quality Gate **OK** (https://sonarcloud.io/dashboard?id=fizzaniaz17-arch_kitchen-nasty&pullRequest=32).
