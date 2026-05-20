# Phase 2 Implementation Notes

**Date:** 2026-05-20  
**Status:** Measurement pass completed — evidence artifacts captured; API performance and U11 still miss original targets.

## Completed in codebase

| Unit | Change |
|------|--------|
| U13 | Removed `d.content` from `GET /api/issues` list SELECT; weeks active list query rewritten with `LEFT JOIN LATERAL` aggregations |
| U14 | Migration `038_shipshape_query_perf_indexes.sql` (`idx_documents_sprint_number`, `idx_documents_sort`) |
| U12 | `React.lazy` + `Suspense` for `UnifiedDocumentPage`; SlashCommands static imports (fixes mixed dynamic/static warnings) |
| U16/U7 | `@ship/shared` error capture; Express `errorHandler`; `unhandledRejection`; client listeners; top-level `ErrorBoundary` |
| U17 | FilterTabs contrast (`text-foreground/80`); TeamMode week header contrast; Login `<main>` landmark |
| U11 (partial) | `IssueRow` type + typed `extractIssueFromRow` in `issues.ts` |

## Measurement results captured

| Unit | Artifact | Result |
|------|----------|--------|
| U11 | `eval/results/type-safety-after.json`, `eval/results/type-coverage-after.txt` | Type coverage improved slightly to 93.53%, but conservative grep violations are 401 vs 399 baseline; U11 target not met |
| U12 | `eval/results/bundle-after.json` | Main chunk 2,073.70 KB → 1,671.05 KB (-19.4%); close, but just under the 20% initial-load target |
| U13 | `eval/results/api-benchmark-after.json` | Documents c=25 improved 6.36%; issues c=25 improved 9.9%; target of ≥20% on two endpoints not met |
| U14 | `eval/results/db-query-after.md` | Migration 038 verified; EXPLAIN captured for rewritten weeks query; endpoint benchmark did not show improvement under c=50 |
| U15 | `eval/results/test-coverage-after.json`, `eval/results/empty-tests-after.json` | 451/451 API tests pass with 40.57% line coverage; empty-test detector now reports 0 empty tests |
| U17 | `eval/results/axe-after.json` | 0 Critical/Serious/Moderate/Minor axe violations across login/docs/projects/team after final contrast fixes |

## Not started / deferred

- U11 full hotspot pass (UnifiedEditor, projects.ts, weeks.ts, yjsConverter)
- U12 needs one additional small split/optimization to clear the 20% target instead of landing at 19.4%
- U13 needs stronger implementation work (documents pagination/projection and/or measured query payload reduction) to clear ≥20% P95 on two endpoints
- U14 needs either a larger seeded benchmark or a targeted query change that improves the actual endpoint benchmark
- Item B API pagination on `/api/documents`
- WebSocket reconnect UI (U16 stretch)
