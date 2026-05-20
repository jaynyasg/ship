# Phase 05 ESLint Baseline Summary

Date: 2026-05-20

Command:

```powershell
pnpm exec eslint api web shared --format json --output-file eval/results/eslint-phase05-baseline.json
```

## Result

| Metric | Count |
|---|---:|
| Files checked | 333 |
| Files with findings | 116 |
| Errors | 487 |
| Warnings | 29 |

`pnpm lint` now runs ESLint through the workspace scripts. It exits non-zero because the new rules expose existing baseline findings; this is expected for Phase 05 and is not a parser/configuration crash.

## Top Rules

| Rule | Count |
|---|---:|
| `@typescript-eslint/no-explicit-any` | 202 |
| `@typescript-eslint/no-unused-vars` | 97 |
| `react-hooks/set-state-in-effect` | 42 |
| `react-hooks/exhaustive-deps` | 29 |
| `react-hooks/refs` | 29 |
| `jsx-a11y/label-has-associated-control` | 22 |
| `jsx-a11y/role-has-required-aria-props` | 15 |
| `jsx-a11y/click-events-have-key-events` | 12 |
| `react-hooks/immutability` | 12 |
| `jsx-a11y/no-static-element-interactions` | 9 |

## Top Files

| File | Findings |
|---|---:|
| `api/src/__tests__/transformIssueLinks.test.ts` | 37 |
| `api/src/services/accountability.test.ts` | 33 |
| `api/src/__tests__/auth.test.ts` | 24 |
| `api/src/__tests__/activity.test.ts` | 23 |
| `web/src/pages/App.tsx` | 23 |
| `api/src/routes/issues-history.test.ts` | 20 |
| `api/src/routes/projects.test.ts` | 17 |
| `web/src/pages/TeamMode.tsx` | 16 |
| `web/src/components/Editor.tsx` | 13 |
| `web/src/components/ui/ContextMenu.tsx` | 13 |

## Notes

- `web/dev-dist/**`, package builds, coverage output, and generated icons are ignored so the baseline tracks maintained source.
- The initial generated-output-inclusive run found 637 errors and 39 warnings; after ignoring `web/dev-dist/**`, the maintained-source baseline is 487 errors and 29 warnings.
- Recommended next cleanup order: explicit `any` in API tests, unused variables, React hooks findings, then JSX accessibility findings.
