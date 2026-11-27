# KitchenAsty — Consolidated Group AI-Use Record

**Project:** KitchenAsty (SE3002 Software Quality Engineering)  
**Branch:** `integration/final-sqe-submission`  
**Date:** 2026-11-27  

---

## Summary by Team Member

| Member | Tool(s) Used | Tasks Supported | Tool Contribution | Human Review & Verification | Limitations / Corrections |
|---|---|---|---|---|---|
| **Member 1** | AI Coding Assistant (recorded in `docs/sqe/member-1/risk-and-exit.md`) | White-box unit tests, Stryker config, MCC/MC-DC & quality documentation | Produced initial test, configuration, and documentation drafts | Verified every business rule against controller source, reran all Vitest/Stryker/CI commands at `03d977c` / `80f720c`, inspected 15+ surviving mutants, and verified manual CFG `V(G)=9` | Function-level Sonar `complexity` returned HTTP 403; manual CFG kept separate and never represented as Sonar-measured |
| **Member 2** | OpenAI Codex (recorded in `docs/sqe/member-2/ai-use-log.md`) | Scoped OpenAPI spec, EP/BVA generator, Vitest API suite, PostgreSQL isolation, defect register | Drafted `reservations.openapi.json`, `generate-ep-bva.mjs`, `reservations.db.member2.ts`, transition regressions, and child-process timeout probes | Audited generated 296 case IDs against `audit-final-results.json`, verified constraint-shift regeneration, preserved all 36 genuine requirement failures without altering production code | Independent human & teammate sign-off noted as pending in `ai-use-log.md`; 36 failures represent real implementation gaps |
| **Student 3** | AI Coding Assistant (Antigravity / IDE agent) | Use case specs, Playwright E2E/accessibility/RBAC specs, k6 script & docs, dependency audit reconciliation, integration & evidence audit | Drafted structured use cases, fixed `usability-keyboard.spec.ts` (`ArrowDown` + `<input type="date">` Tab handling), authored `security-rbac.spec.ts`, aligned `/api/auth/me` mocks (`7c00ebe`), and compiled audit/defect/sign-off docs | Student 3 executed and verified builds, unit tests, 24/24 Playwright tests (`--workers=1`), Lighthouse/axe-core scans, ZAP passive scan, k6 4×60s runs, and PostgreSQL recovery logs against live containers | Mocked `/api/auth/me` initially failed on `kitchen-nasty` until aligned with `AuthContext`; global `/api/` rate limiter documented and bypassed via `NODE_ENV=test` in `playwright.config.ts` |

---

## Verification Principles Followed
1. No AI-generated test output, screenshot, metric, or pass count was fabricated or accepted without local tool execution.
2. All 36 Member 2 API requirement failures and open Student 3 security findings (`D-01..D-04`) were preserved honestly.
3. All automated outputs are backed by retained raw JSON, TXT, LCOV, HTML, and PNG artifacts in `docs/sqe/` and `reports/`.
