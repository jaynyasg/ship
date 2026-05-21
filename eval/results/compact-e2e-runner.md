# Compact E2E Runner Verification

## Scope

Phase 14 makes `pnpm test:e2e` the compact Playwright runner for local and agent-driven workflows. Raw Playwright output is moved to `pnpm test:e2e:raw`.

## Expected Behavior

- `pnpm test:e2e` invokes `node scripts/run-e2e.mjs`.
- Raw stdout/stderr are captured under `test-results/runner/`.
- Progress is reported from `test-results/summary.json`.
- Focused files and Playwright flags pass through unchanged.
- `pnpm test:e2e:raw` remains available only for explicit raw-output debugging.

## Verification Commands

```powershell
node --check scripts/run-e2e.mjs
node scripts/run-e2e.mjs --help
node scripts/run-e2e.mjs --dry-run -- --last-failed
pnpm test:e2e -- --help
pnpm test:e2e -- --dry-run -- --last-failed
pnpm type-check
git diff --check
```

## Residual Risk

This phase verifies runner parsing and integration without launching the full E2E suite. A full release check should still run `pnpm test:e2e` with local PostgreSQL available.
