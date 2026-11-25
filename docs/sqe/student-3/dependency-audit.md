# Student 3 Dependency Audit Report

## Summary

An initial full audit reported 95 findings (6 critical, 50 high, 31 moderate, 8 low). After compatible updates and evaluated transitive overrides, the 2026-11-22 full audit reported 22 findings (0 critical, 1 high, 21 moderate). Its production-only total fell from 62 (3 critical, 31 high, 26 moderate, 2 low) to 20 (0 critical, 1 high, 19 moderate). The server production workspace audit reported zero findings at that time. The 2026-11-26 registry recheck is recorded below.

The full production-only audit includes all workspaces, including the Expo mobile app. The remaining production high/moderate findings are concentrated in the Expo 52 toolchain, not the server runtime.

## Applied remediations

- Updated dependencies within compatible ranges, including `proxy-addr` 2.0.8, `shell-quote` 1.12.0, and `qs` 6.17.1.
- Applied a scoped `tar` 7.5.23 override for Expo's CLI/cache dependency path. Expo config parsing passed after the override.
- Updated `@xmldom/xmldom` to 0.8.15 and PostCSS to 8.5.33; Expo configuration and documentation builds passed.
- Used Vite 6.4.6 for VitePress 1.6.4 through a scoped override. The documentation production build passed.
- Upgraded direct packages selected during triage, including React Router, Vite, Vue, Babel, Multer, Nodemailer, express-rate-limit, Vitest, and Zod. The Zod 4 API changes were carried through affected controllers.
- Added `query-string` 9.5.1 directly to the mobile workspace after the Expo Router bundle exposed an undeclared Metro resolution dependency. Its `decode-uri-component` dependency resolves to 0.5.1; the full and production audit totals remain unchanged.
- Added storefront-only Vitest coverage tooling and focused social-auth callback/context tests; the full audit remains at 22 findings.
- Removed unused storefront `intlayer` and redundant `@types/nodemailer` packages.

The npm 10 `audit fix --dry-run` command failed in Arborist; npm 12.2.3 was used ephemerally to resolve the lockfile. No npm CLI version was added to project dependencies.

## Remaining findings and decisions (reviewed 2026-11-22)

| Finding group | Severity / scope | Decision |
|---|---|---|
| `image-size` 1.2.1 via Expo 52 / Metro 0.81.5 | One high; included in mobile production audit | Deferred. The fixed 2.x API exports a named `imageSize` function, while this Metro version calls the CommonJS export directly. Forcing 2.x would risk breaking asset bundling; resolve with a coordinated Expo/React Native/Metro upgrade or a separately tested upstream-compatible patch. |
| Expo 52 dependency chain (`@expo/*`, Expo packages, `glob`, `uuid`, `xcode`, etc.) | 19 moderate; production-only | Deferred. npm identifies Expo 58.0.26 and coordinated SDK package upgrades as the available remediation. This is a breaking SDK upgrade outside the safe dependency-only scope. |
| `@stryker-mutator/core` and `@stryker-mutator/vitest-runner` | Two moderate; development-only | Deferred. No npm audit fix is currently available for the selected versions. They are not production dependencies. |
| VitePress | No remaining Vite high after the Vite 6.4.6 override | The override passed the docs build; retain regression coverage when updating VitePress. |

## Final advisory reachability review (2026-11-22)

The table above records the initial grouping. The following advisory-level
review supersedes its broad categories and distinguishes build-tool exposure
from application server runtime risk.

| Advisory / package path | Severity / scope | Assessment and decision |
|---|---|---|
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) and [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), `image-size@1.2.1` through Expo 52 / Metro 0.81.5 | High; included in mobile production audit | Crafted JXL/HEIF or ICNS assets can trigger parser denial of service when Metro reads project asset bytes. This is build/dev-time availability exposure if an attacker can supply an asset to the project, not a production server-runtime path. Fixed in 2.0.3, but Metro 0.81.5 declares `^1.0.2` and invokes the CommonJS export as a function; 2.x exports an object. No safe drop-in override was applied. A coordinated Expo/Metro upgrade or an API-adapting, regression-tested Metro change is needed. |
| [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), `glob@10.5.0` in Expo CLI/config tooling | Moderate; transitive tooling finding | Continued filesystem traversal after an aborted glob walk. `glob@14.0.2` is fixed, but no compatible patch was identified in the installed glob 10 range. Exposure is to build/tooling availability, not application server runtime. |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), nested `minimatch@9.0.9` and development `minimatch@10.2.6` | Moderate; Expo and development tooling | Pattern-amplification denial of service; fixed in `11.0.1`, outside the current dependency ranges. No compatible in-range override was identified. |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), `uuid@8.3.2` and Xcode's nested `uuid@7.0.3` | Moderate; transitive Expo/Xcode chain | Affected call forms use caller-provided buffers; the inspected Xcode path uses `uuid.v4()`. No reachable vulnerable-form call was found in the reviewed path. Patched UUID majors do not fit the existing dependency ranges. |

As of 2026-11-22, the audit reported 22 findings (0 critical, 1 high, 21
moderate), 20 production-only findings (0 critical, 1 high, 19 moderate), and
zero server production findings. The Expo 58.0.26 suggestion was a coordinated
semver-major SDK migration, not a compatible in-range fix; no dependency
upgrade was made during that review.

## Current registry recheck (2026-11-26)

| Audit scope | Total | Critical | High | Moderate | Low |
|---|---:|---:|---:|---:|---:|
| Full dependency tree | 23 | 0 | 1 | 22 | 0 |
| Combined production dependencies | 21 | 0 | 1 | 20 | 0 |
| Server production workspace | 0 | 0 | 0 | 0 | 0 |

The full and production JSON output is retained in
`reports/student-3/evidence/tests/npm-audit-rerun.json` and
`npm-audit-production-rerun.json`; the server production output is
`npm-audit-server-production-rerun.json`. The increase from the 2026-11-22
counts reflects registry advisories at this later point in time, not a code or
lockfile change. The audit now marks `i18next` below 26.3.4 as moderate; its
suggested 27.2.9 fix is semver-major. The Expo package fixes also require a
coordinated semver-major SDK migration.

The high `image-size@1.2.1` finding remains in the Expo/Metro toolchain.
Although npm's audit metadata marks an automated fix candidate, the fixed
`image-size` 2.x API is incompatible with the installed Metro 0.81.5
CommonJS usage and declared 1.x range. No forced override was applied.
`npm audit fix --dry-run --json` also failed in the installed npm 10.9.8
Arborist with `Cannot read properties of null (reading 'edgesOut')`; the dry
run did not modify the lockfile or dependencies. Raw output is retained at
`reports/student-3/evidence/tests/npm-audit-fix-dry-run.json`.

## CI regression follow-up

PR CI caught that Zod 4 applies create-schema defaults when `.partial()` update schemas are parsed. The affected controller update schemas now explicitly keep those defaulted fields optional, and regression assertions verify partial requests write only the supplied fields. A separate mobile bundle failure was caused by Expo Router importing `query-string` without a package Metro could resolve after the navigation dependency update; the safe direct dependency restores resolution without adding an audit finding.

The SonarCloud run then reported 2.5% new-code coverage because its updated scope behavior ignored the configured source/test properties while CI imported only Member 1 coverage. The workflow now excludes test/E2E and out-of-scope mobile files, generates server and storefront LCOV reports, and keeps the existing quality-gate threshold. The earlier 130/153 changed-source figure predates the recovery error-handling change and is not claimed as the current percentage. Local verification regenerated the reports and confirmed 62 server and 2 storefront source paths are normalized to repository-relative paths. The current remote Sonar check is still failing and predates the local changes; a new PR run is required for a final result.

## Earlier validation (before the final recovery/test rerun)

| Validation | Result |
|---|---|
| `npm test` | 420 passed across shared, server unit, and integration tests |
| Focused partial-update regression suites | 121 passed |
| Full server coverage run | 459 passed |
| Storefront social-auth tests and coverage | 5 passed; combined changed-source coverage 85.0% |
| Member 1 coverage gate | 56 passed; 100% statements, branches, functions, and lines |
| Member 1 mutation gate | 64.93%; above the 60% break threshold |
| Mobile typecheck | Passed |
| Expo `config --type public` | Passed |
| iOS and Android Expo bundle exports | Passed |
| Server TypeScript build | Passed |
| Shared/server/admin/storefront builds | Passed |
| VitePress documentation build | Passed |
| Server production audit | 0 findings |

## Final validation (2026-11-22)

| Validation | Result |
|---|---|
| `npm test` | 421 passed: 17 shared, 60 server unit, and 344 server integration |
| Full server coverage / Sonar LCOV | 460 passed across 29 files (2026-11-22 historical run) |
| Member 1 coverage gate | 56 passed; 100% statements, branches, functions, and lines |
| Storefront tests and coverage | 5 passed |
| Full Playwright E2E | 135 passed, 5 failed: four existing Member 1 reservation tests have an auth mock shape incompatible with `AuthContext`; the parallel footer failure passed when rerun alone |
| Security-header and social-auth browser regressions | 3 passed |
| Mobile typecheck and iOS/Android Expo exports | Passed |
| Server TypeScript and shared/server/admin/storefront builds | Passed |
| VitePress documentation build | Passed |
| Sonar LCOV path verification | Passed: 62 server and 2 storefront source records use repository-relative paths |
| Final audit | 22 full, 20 production-only, 0 server production findings |
| Local lint script | Unavailable: `eslint` is not installed; no tooling dependency was added |

## Current coverage rerun (2026-11-26)

The full server Vitest coverage run passed 463 tests across 29 files and
generated the configured `packages/server/coverage/sonar/lcov.info`. The
storefront coverage command passed 5 tests and generated
`packages/storefront/coverage/sonar/lcov.info`. Both configured paths were
verified to exist. Sonar analysis itself was not run because `sonar-scanner`
and a local `SONAR_TOKEN` were unavailable; the analysis must run in the
configured CI/Sonar environment. Server coverage output is retained at
`reports/student-3/evidence/tests/server-coverage-rerun.txt`.

## Audit evidence files

- Initial full audit: `reports/student-3/security/npm-audit-baseline.json`
- Initial production-only audit: `reports/student-3/security/npm-audit-production-baseline.json`
- Final full audit: `reports/student-3/security/npm-audit-final.json`
- Final production-only audit: `reports/student-3/security/npm-audit-production-final.json`
- Final server production audit: `reports/student-3/security/npm-audit-server-production-final.json`

Audit totals are a point-in-time registry result and can change as new advisories are published.
