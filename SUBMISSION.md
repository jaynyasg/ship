# ShipShape Submission Summary

**Date:** 2026-05-20  
**Repo:** `jaynyasg/ship`  
**Current main commit after Phase 04:** `5636709 Highlight Phase 04 critical path`

This file is the reviewer-facing map for the ShipShape audit work. The detailed report remains `AUDIT.md`; the raw before/after evidence lives in `eval/results/`.

## What Changed

All seven PDF improvement categories have reproducible after-measurements:

| Category | Evidence | Result |
|---|---|---|
| Type safety | `eval/results/type-safety-after.json`, `type-coverage-after.txt` | Grep violations 399 -> 294 (-26.32%); type coverage 93.47% -> 93.96% |
| Bundle size | `eval/results/bundle-after.json` | Entry JS 2,073.70 KB -> 287.36 KB (-86.14%) through route-level lazy loading |
| API response time | `eval/results/api-benchmark-after.json` | Paginated documents P97.5 283 ms -> 82 ms; paginated issues P97.5 192 ms -> 116 ms |
| DB/query efficiency | `eval/results/db-query-after.md`, `api-benchmark-weeks-u14-after.json` | `GET /api/weeks` drops from 5 -> 3 DB statements for seeded super-admin flow and 6 -> 4 for normal member flow |
| Tests | `eval/results/test-coverage-after.json`, `empty-tests-after.json` | 455/455 API tests passing; empty Playwright test detector now reports 0 empty tests |
| Runtime errors | `eval/results/error-after.md` | Shared in-house error capture, Express error middleware, unhandled rejection hook, client listeners, and React top-level error boundary |
| Accessibility | `eval/results/axe-after.json` | 0 axe violations across login, docs, projects, and team pages after contrast/landmark fixes |

## Phase 04 Product Upgrade

After the seven audit categories closed, Ship added a Microsoft Project-inspired planning surface while preserving the unified document model:

| Phase | Result |
|---|---|
| 04A Dependency data model | `depends_on` document associations, dependency CRUD, workspace scoping, and cycle rejection |
| 04B Timeline read model | Project/program timeline endpoint with related weeks, issues, dependency edges, blocked/overdue/at-risk flags, and measured timing evidence |
| 04C Timeline UI | Lazy-loaded Timeline tab with timeline bars, health badges, dependency summaries, keyboard-openable rows, and baseline controls |
| 04D Baseline variance | Project/program baseline snapshots and current-vs-baseline variance reporting |
| 04E Critical path | Compact critical-path computation, API/shared/OpenAPI fields, ordered row badges, and highlighted critical timeline bars |

## Phase 05 Quality Gate

Ship now has an executable ESLint baseline across `api`, `web`, and `shared`, using recommended TypeScript rules plus React Hooks and JSX accessibility checks for web code. The baseline is intentionally committed before cleanup so future work can burn it down against a measured starting point: 333 files checked, 116 files with findings, 487 errors, and 29 warnings.

## Files To Read

- `AUDIT.md` - full audit narrative with baseline, severity, and after status.
- `ORIENTATION.md` - codebase orientation and architecture synthesis.
- `eval/results/phase2-implementation-notes.md` - concise implementation and measurement log.
- `docs/brainstorms/2026-05-20-phase-04-ms-project-inspired-improvements.md` - Phase 04 implementation evidence for Microsoft Project-inspired timeline/dependency improvements.
- `docs/brainstorms/2026-05-20-phase-05-eslint-quality-gate.md` - Phase 05 lint gate scope and baseline evidence.

## Verification Commands

These were the core checks used during the final Phase 2 pass:

```powershell
pnpm type-check
pnpm --filter @ship/api test
git diff --check
```

Local PostgreSQL must be running for API tests and migrations. Docker was not available in this Windows environment, so the project used the user's local PostgreSQL installation.

These were the core checks used during the Phase 04 completion pass:

```powershell
pnpm type-check
pnpm --filter @ship/api test -- src/routes/timeline.test.ts src/routes/dependencies.test.ts
pnpm --filter @ship/web test -- src/lib/document-tabs.test.ts
pnpm build:web
pnpm --filter @ship/api test
git diff --check
```

## Known Follow-Ups

- WebSocket reconnect UI remains a stretch item for runtime resilience.
- Playwright E2E execution on Windows was blocked at baseline by bash/POSIX script assumptions; this is documented in `ORIENTATION.md` finding #20.
- Critical CVE remediation remains the highest-leverage next backlog item.
