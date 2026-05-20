# ShipShape Submission Summary

**Date:** 2026-05-20  
**Repo:** `jaynyasg/ship`  
**Latest verified main before Phase 07:** `bd83a30 Remediate critical dependency CVEs`

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

## Phase 06 Security Remediation

The dependency audit critical count is now 0. Phase 06 used narrow `pnpm.overrides` to lift `fast-xml-parser`, `protobufjs`, and `@protobufjs/utf8` to patched versions, preserving the current AWS SDK and testcontainers parent APIs. The after-audit artifact is `eval/results/dependency-audit-after.json`, and the rationale is documented in `THREAT_MODEL.md`.

## Phase 07 API Pagination Contract

The remaining `/api/documents` pagination gap is closed with page-style query support: `page`, `per_page`, and `limit` now produce a paginated `{ items, pagination }` response with `total_count`. Bare `/api/documents` still returns the legacy array so existing React callers keep working until a frontend pagination UI is intentionally scoped.

## Phase 08 Dependency Audit Zero

The dependency audit now reports 0 critical, 0 high, 0 moderate, and 0 low advisories. Phase 08 used targeted `pnpm.overrides` for runtime, build, and dev-tooling transitive packages while keeping parent package API surfaces stable.

## Files To Read

- `AUDIT.md` - full audit narrative with baseline, severity, and after status.
- `ORIENTATION.md` - codebase orientation and architecture synthesis.
- `THREAT_MODEL.md` - dependency security status, Phase 06 remediation, and residual risk.
- `eval/results/phase2-implementation-notes.md` - concise implementation and measurement log.
- `docs/brainstorms/2026-05-20-phase-04-ms-project-inspired-improvements.md` - Phase 04 implementation evidence for Microsoft Project-inspired timeline/dependency improvements.
- `docs/brainstorms/2026-05-20-phase-05-eslint-quality-gate.md` - Phase 05 lint gate scope and baseline evidence.
- `docs/brainstorms/2026-05-20-phase-06-critical-cve-remediation.md` - Phase 06 critical CVE remediation evidence.
- `docs/brainstorms/2026-05-20-phase-07-documents-pagination-contract.md` - Phase 07 documents pagination contract and compatibility decision.
- `docs/brainstorms/2026-05-20-phase-08-dependency-audit-zero.md` - Phase 08 dependency remediation evidence.
- `eval/results/documents-pagination-contract.md` - concise API contract evidence for page-style `/api/documents` pagination.

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
- Dependency overrides should be retired as upstream parent packages naturally absorb patched transitive versions.
