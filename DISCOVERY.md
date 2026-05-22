# Discovery Write-up

This write-up pulls three lessons from the orientation findings in `ORIENTATION.md`. These are not category-by-category improvement notes; they are the codebase comprehension discoveries that most changed how the audit should be approached.

## 1. Setup reliability is part of product quality

**Orientation findings:** #1 through #5, #19, and #20.

The first surprise was that setup problems were not just documentation polish. On Windows, several baseline paths were blocked by platform assumptions: the original `pnpm dev` path depended on bash, the frontend build used POSIX inline environment-variable syntax, and the API build relied on `cp`. The README also blurred local PostgreSQL and Docker port expectations, and it described `pnpm test` as though it ran Playwright when it actually ran API Vitest.

**Codebase references:**

- `README.md` now documents local PostgreSQL-first setup, `pnpm dev`, Docker as optional, and the correct test commands.
- `scripts/dev.mjs` is the cross-platform root development wrapper.
- `api/scripts/build.mjs` copies schema and migration files without POSIX shell commands.
- `web/scripts/build.mjs` builds the frontend without POSIX environment-variable syntax.
- `eval/results/setup-docs-hardening.md`, `eval/results/cross-platform-dev-wrapper.md`, and `eval/results/e2e-windows-build-unblock.md` record the verification.

**Reflection:** I would normally treat setup fixes as developer experience work adjacent to the main audit. Here they were audit-critical. If reviewers or new contributors cannot run the app, every measurement becomes less reproducible. The lesson is to measure "can a fresh developer run this?" as an engineering quality signal, not as a courtesy task.

## 2. Strong TypeScript does not replace linting

**Orientation findings:** #12, #14, and #15.

The codebase already had a surprisingly strong TypeScript floor: strict mode passed, `noUncheckedIndexedAccess` was enabled, and type coverage was already high. That invalidated the simple assumption that Category 1 would be about "turning strict on." The real gap was different: there was no ESLint configuration, so rules for unused variables, React Hooks correctness, JSX accessibility, and other maintainability checks were not enforced.

**Codebase references:**

- `tsconfig.json` shows the strict compiler options.
- `eval/results/type-safety-baseline.json` and `eval/results/type-coverage-baseline.txt` capture the baseline type-safety measurements.
- `eslint.config.mjs` now adds TypeScript, React Hooks, and JSX accessibility checks.
- `eval/results/eslint-phase05-summary.md` records the ESLint burn-down to 0 findings.

**Reflection:** This changed the audit posture from "add type safety" to "respect the existing type-safety floor and add the missing quality layer." It is a good reminder that tools overlap but do not substitute for each other. TypeScript answers "can this program type-check?" ESLint and framework-specific rules answer a wider set of questions about correctness, accessibility, and maintenance.

## 3. Test counts can hide false confidence

**Orientation finding:** #18.

The repository had a large test suite, but the orientation pass found six Playwright tests that silently passed despite containing only placeholder bodies. Ship already had a pre-commit hook intended to detect empty tests, which made the finding even more important: the control existed, but the codebase still carried historical false confidence.

**Codebase references:**

- `scripts/check-empty-tests.sh` detects placeholder Playwright tests.
- `.husky/pre-commit` invokes the empty-test check.
- `eval/results/empty-tests-baseline.json` records the baseline empty-test findings.
- `eval/results/empty-tests-after.json` records the after-state with 0 empty tests.
- `eval/results/full-e2e-gate.md` records the final compact E2E run with 869 passed, 0 failed, 0 skipped, and 0 pending.

**Reflection:** A passing test suite is not automatically a trustworthy test suite. The useful measure was not just "how many tests pass?" but "how many tests prove behavior?" The lesson I would carry forward is to add lightweight checks for test quality footguns, especially in frameworks where empty tests are valid syntax.
