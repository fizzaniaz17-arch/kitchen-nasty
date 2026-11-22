# Student 3 Dependency Audit Report

## Summary

An initial full audit reported 95 findings (6 critical, 50 high, 31 moderate, 8 low). After compatible updates and evaluated transitive overrides, the final full audit reports 22 findings (0 critical, 1 high, 21 moderate). The production-only total fell from 62 (3 critical, 31 high, 26 moderate, 2 low) to 20 (0 critical, 1 high, 19 moderate). The server production workspace audit reports zero findings.

The full production-only audit includes all workspaces, including the Expo mobile app. The remaining production high/moderate findings are concentrated in the Expo 52 toolchain, not the server runtime.

## Applied remediations

- Updated dependencies within compatible ranges, including `proxy-addr` 2.0.8, `shell-quote` 1.12.0, and `qs` 6.17.1.
- Applied a scoped `tar` 7.5.23 override for Expo's CLI/cache dependency path. Expo config parsing passed after the override.
- Updated `@xmldom/xmldom` to 0.8.15 and PostCSS to 8.5.33; Expo configuration and documentation builds passed.
- Used Vite 6.4.6 for VitePress 1.6.4 through a scoped override. The documentation production build passed.
- Upgraded direct packages selected during triage, including React Router, Vite, Vue, Babel, Multer, Nodemailer, express-rate-limit, Vitest, and Zod. The Zod 4 API changes were carried through affected controllers.
- Removed unused storefront `intlayer` and redundant `@types/nodemailer` packages.

The npm 10 `audit fix --dry-run` command failed in Arborist; npm 12.2.3 was used ephemerally to resolve the lockfile. No npm CLI version was added to project dependencies.

## Remaining findings and decisions

| Finding group | Severity / scope | Decision |
|---|---|---|
| `image-size` 1.2.1 via Expo 52 / Metro 0.81.5 | One high; included in mobile production audit | Deferred. The fixed 2.x API exports a named `imageSize` function, while this Metro version calls the CommonJS export directly. Forcing 2.x would risk breaking asset bundling; resolve with a coordinated Expo/React Native/Metro upgrade or a separately tested upstream-compatible patch. |
| Expo 52 dependency chain (`@expo/*`, Expo packages, `glob`, `uuid`, `xcode`, etc.) | 19 moderate; production-only | Deferred. npm identifies Expo 58.0.26 and coordinated SDK package upgrades as the available remediation. This is a breaking SDK upgrade outside the safe dependency-only scope. |
| `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` | Two moderate; development-only | Deferred. No npm audit fix is currently available for the selected versions. They are not production dependencies. |
| VitePress | No remaining Vite high after the Vite 6.4.6 override | The override passed the docs build; retain regression coverage when updating VitePress. |

## Validation

| Validation | Result |
|---|---|
| `npm test` | 395 passed across shared, server unit, and integration tests |
| Mobile typecheck | Passed |
| Expo `config --type public` | Passed |
| Shared/server/admin/storefront builds | Passed |
| VitePress documentation build | Passed |
| Security-related Playwright checks | 3 passed |
| Server production audit | 0 findings |

## Audit evidence files

- Initial full audit: `reports/student-3/security/npm-audit-baseline.json`
- Initial production-only audit: `reports/student-3/security/npm-audit-production-baseline.json`
- Final full audit: `reports/student-3/security/npm-audit-final.json`
- Final production-only audit: `reports/student-3/security/npm-audit-production-final.json`
- Final server production audit: `reports/student-3/security/npm-audit-server-production-final.json`

Audit totals are a point-in-time registry result and can change as new advisories are published.
