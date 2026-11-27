# Student 3 — Dependency Audit Report (Reconciled)

## Executive Summary

This report reconciles the **pre-remediation baseline** dependency audit (`npm-audit.json`: **89** findings) with the **post-remediation** audit (`npm-audit-final.json`: **22** findings) and the **current integration branch** audit (**23** findings after installing `@axe-core/playwright` and `lighthouse` plus 2026-11-26 registry advisories).

| Audit Snapshot | Evidence File / Command | Critical | High | Moderate | Low | Total |
|---|---|---:|---:|---:|---:|---:|
| **Pre-remediation baseline** (0.3.2 `d6af723`, before PR #7 overrides) | `reports/student-3/security/npm-audit.json` | 5 | 47 | 30 | 7 | **89** |
| **Post-remediation (PR #7, 2026-11-22)** | `reports/student-3/security/npm-audit-final.json` | 0 | 1 | 21 | 0 | **22** |
| **Server production workspace (PR #7)** | `reports/student-3/security/npm-audit-server-production-final.json` | 0 | 0 | 0 | 0 | **0** |
| **Integration branch `npm install` (2026-11-27)** | `npm install` on `integration/final-sqe-submission` | 0 | 1 | 22 | 0 | **23** |

---

## Why the Counts Differ (89 → 22 → 23)

1. **Why the original audit reported 89 findings (`npm-audit.json`)**:
   - It was captured on the un-remediated `0.3.2` baseline (`d6af723`) across all workspaces (`server`, `admin`, `storefront`, `docs`, `mobile`) and root devDependencies before PR #7's compatible updates and `overrides` were applied.
2. **What remediation was applied (PR #7 / `docs/sqe/student-3/dependency-audit.md`)**:
   - Compatible updates for `proxy-addr` (`2.0.8`), `shell-quote` (`1.12.0`), `qs` (`6.17.1`), React Router, Vite, Vue, Babel, Multer, Nodemailer, `express-rate-limit`, Vitest, and Zod.
   - Scoped `overrides` in root `package.json`: `@xmldom/xmldom` (`^0.8.15`), `postcss` (`^8.5.33`), `qs` (`^6.16.2`), `tar` (`^7.5.23`), and `vitepress -> vite` (`^6.4.6`).
   - Removed unused storefront `intlayer` and redundant `@types/nodemailer`.
3. **Why the post-remediation audit reported 22 findings (`npm-audit-final.json`)**:
   - All **5 critical**, **46 of 47 high**, and all **7 low** findings were eliminated, leaving **1 high** and **21 moderate** findings concentrated in Expo 52 / Metro (`packages/mobile`) and Stryker devDependencies.
   - The `packages/server` production audit dropped to **0 vulnerabilities**.
4. **Why the current integration branch reports 23 findings (`0 critical, 1 high, 22 moderate`)**:
   - Reflects the 2026-11-26 npm registry advisory for `i18next` (`< 26.3.4`, moderate) documented in `docs/sqe/student-3/dependency-audit.md`, not a regression in `packages/server`.

---

## Remaining Vulnerabilities & Override Risks

| Package / Path | Severity | Scope | Reason Unresolved & Residual Risk |
|---|---|---|---|
| `image-size@1.2.1` (via Expo 52 / Metro `0.81.5`) | High (1) | Mobile build/dev tooling | Fixed in `2.x`, which changes CommonJS export shape; Metro `0.81.5` invokes it as a function (`^1.0.2`). Forcing `2.x` breaks mobile bundling. Not reachable in `packages/server`. |
| Expo 52 transitive chain (`glob@10.5.0`, `minimatch`, `uuid`) | Moderate (19–20) | Mobile build/tooling | Requires semver-major Expo SDK 58 upgrade; deferred to avoid breaking mobile compatibility. |
| `i18next < 26.3.4` | Moderate (1) | Storefront/Admin i18n | Suggested fix (`27.2.9`) is semver-major; deferred. |
| `@stryker-mutator/core` / `vitest-runner` | Moderate (2) | Dev-only mutation testing | No non-breaking fix available; not shipped in production. |

### Compatibility & Maintenance Risks of Applied Overrides
- Root `package.json` overrides (`tar`, `vitepress.vite`, `qs`, `postcss`, `@xmldom/xmldom`) were verified against `npm run build`, Expo config/bundle exports, and VitePress docs build.
- **Residual maintenance risk:** Future upgrades of `vitepress` or `expo` must re-evaluate these pinned overrides so they do not mask or conflict with newer upstream major versions.

---

## Retained Evidence Files
- Pre-remediation baseline: `reports/student-3/security/npm-audit.json` (89 findings) and `npm-audit-baseline.json`
- Post-remediation: `reports/student-3/security/npm-audit-final.json` (22 findings) and `npm-audit-server-production-final.json` (0 findings)
- Detailed advisory triage: `docs/sqe/student-3/dependency-audit.md`
