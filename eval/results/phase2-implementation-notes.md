# Phase 2 Implementation Notes

**Date:** 2026-05-20  
**Status:** Measurement pass completed — evidence artifacts captured; U11 type-safety, U12 bundle, and U13 API response-time targets are now met, while U14 still needs work.

## Completed in codebase

| Unit | Change |
|------|--------|
| U13 | Removed `d.content` from `GET /api/issues` list SELECT; weeks active list query rewritten with `LEFT JOIN LATERAL` aggregations |
| U13 | Added backward-compatible `GET /api/documents?limit=&offset=` pagination with optional `include_total=true`; default `/api/documents` array response remains unchanged |
| U13 | Added backward-compatible `GET /api/issues?limit=&offset=` pagination with optional `include_total=true`; default `/api/issues` array response remains unchanged |
| U14 | Migration `038_shipshape_query_perf_indexes.sql` (`idx_documents_sprint_number`, `idx_documents_sort`) |
| U12 | `React.lazy` + `Suspense` for `UnifiedDocumentPage`; SlashCommands static imports (fixes mixed dynamic/static warnings) |
| U12 | Route-level lazy loading for `AppLayout` and top-level pages; heavy app/editor/page code now loads from async chunks instead of the entry script |
| U16/U7 | `@ship/shared` error capture; Express `errorHandler`; `unhandledRejection`; client listeners; top-level `ErrorBoundary` |
| U17 | FilterTabs contrast (`text-foreground/80`); TeamMode week header contrast; Login `<main>` landmark |
| U11 (partial) | `IssueRow` type + typed `extractIssueFromRow` in `issues.ts` |
| U11 | Typed Yjs/TipTap conversion utilities, y-protocol declarations, project/week route helpers, unified editor/panel narrowing, and TipTap editor extension callbacks |

## Measurement results captured

| Unit | Artifact | Result |
|------|----------|--------|
| U11 | `eval/results/type-safety-after.json`, `eval/results/type-coverage-after.txt` | Target met: conservative grep violations reduced from 399 to 294 (-26.32%); type-coverage improved from 93.47% to 93.96% |
| U12 | `eval/results/bundle-after.json` | Target met: entry script 2,073.70 KB → 287.36 KB (-86.14%); `AppLayout`, editor-heavy document pages, login, reviews, team, and settings code deferred into async chunks |
| U13 | `eval/results/api-benchmark-after.json`, `eval/results/api-benchmark-documents-limit50-c25.json`, `eval/results/api-benchmark-issues-limit50-c25.json` | Target met: documents paginated c=25 improved 71.02% (283 ms -> 82 ms P97.5); issues paginated c=25 improved 39.58% (192 ms -> 116 ms P97.5) |
| U14 | `eval/results/db-query-after.md` | Migration 038 verified; EXPLAIN captured for rewritten weeks query; endpoint benchmark did not show improvement under c=50 |
| U15 | `eval/results/test-coverage-after.json`, `eval/results/empty-tests-after.json` | 455/455 API tests pass with 41.27% line coverage; empty-test detector now reports 0 empty tests |
| U17 | `eval/results/axe-after.json` | 0 Critical/Serious/Moderate/Minor axe violations across login/docs/projects/team after final contrast fixes |

## Not started / deferred

- U14 needs either a larger seeded benchmark or a targeted query change that improves the actual endpoint benchmark
- WebSocket reconnect UI (U16 stretch)
