# Student 3 — Dependency Audit Report

## Audit Method

The dependency audit was performed using `npm audit` against the full workspace
after `npm install` on the local checkout at commit `d6af7237e9569ebeab19ccab375362f9d144e25e`
(version 0.3.2).

The raw audit output is saved as `reports/student-3/security/npm-audit.json`.

---

## Summary

| Severity | Count |
|---|---:|
| Critical | 5 |
| High | 47 |
| Moderate | 30 |
| Low | 7 |
| **Total** | **89** |

---

## Scope Clarification

The audit covers the **entire workspace** including:
- `packages/server` — Express API (production runtime)
- `packages/admin` — React admin app (build-time only)
- `packages/storefront` — React storefront (build-time only)
- `packages/docs` — VitePress documentation (build-time only)
- `packages/mobile` — React Native mobile app (build-time only)
- Root devDependencies (Playwright, Lighthouse, Prisma, TypeScript)

Most findings affect **development and build dependencies** (Vite, Webpack,
React Native, Expo, documentation tooling), not the production runtime API.

---

## Key Findings by Package Category

### Production Runtime (packages/server)

| Package | Version | Severity | Description | Impact | Recommendation |
|---|---|---|---|---|---|
| express | ^4.x transitive deps | Moderate | Prototype pollution in qs/body-parser | Low — application uses Zod validation | Monitor for express@5 compatibility |
| jsonwebtoken | ^9.x | Low | Known timing sidechannel in verification | Low — standard JWT usage | Accept risk; no alternative |

### Build/Development Dependencies

| Category | Packages Affected | Severity Range | Production Impact |
|---|---|---|---|
| Vite/Rollup | Multiple transitive | High–Critical | **None** — build tool only |
| React Native/Expo | Multiple | High–Moderate | **None** — mobile app build tool |
| Webpack (docs) | Multiple transitive | High–Moderate | **None** — docs build only |
| PostCSS/CSS tooling | Various | Moderate | **None** — build-time CSS processing |

### No Automatic Fix Applied

No `npm audit fix` was run because:
1. Many findings are in deeply nested transitive dependencies.
2. Breaking changes in major version bumps could affect build pipelines.
3. The remediation should be coordinated with the full team.

---

## Residual Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Critical findings in build tools (Vite/Rollup) | Low residual | Build tools are not deployed; they process trusted local source code |
| Express transitive vulnerability (qs) | Low residual | Input validation via Zod schema prevents exploitation |
| No dependency pinning (uses `^` ranges) | Informational | Could introduce new vulnerabilities on `npm install`; consider lockfile-only installs in CI |
| Mobile/docs dependencies included in audit count | Informational | Inflates the total count; not relevant to the reservation module runtime |

---

## Recommendations

1. **Separate audit scopes:** Run `npm audit --workspace=packages/server` for production-relevant findings.
2. **Regular updates:** Schedule quarterly dependency reviews with breaking-change testing.
3. **Consider lockfile-only CI installs:** Use `npm ci` to prevent range-resolved changes.
4. **Coordinate with team:** Major version bumps (Express 5, Vite 7, etc.) should be team decisions.

---

## Evidence

- Raw audit: `reports/student-3/security/npm-audit.json`
- Security report: `docs/student-3/security-report.md`
- ZAP findings: `reports/student-3/security/zap-passive.json`
