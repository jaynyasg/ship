# Dependency Override Retirement Pass

Run date: 2026-05-22

## Goal

Reduce maintenance overhead from Phase 08 dependency-security overrides without broad parent-package migrations or reintroducing audit advisories.

## Retired Overrides

Removed 12 overrides whose patched versions are now supplied by direct package ranges, already-updated parent package ranges, or the refreshed lockfile:

- `@protobufjs/utf8`
- `express-rate-limit`
- `minimatch@5.1.6`
- `minimatch@9.0.5`
- `path-to-regexp@0.1.12`
- `path-to-regexp@8.3.0`
- `picomatch@2.3.1`
- `picomatch@4.0.3`
- `postcss`
- `qs`
- `rollup`
- `vite`

## Retained Overrides

The remaining 16 overrides still protect current parent-package surfaces or avoid known resolver backslides:

- `@hono/node-server`, `hono`, `ajv`, `fast-uri`
- `brace-expansion`, `flatted`, `lodash`, `markdown-it`, `svgo`, `undici`, `yaml`
- `fast-xml-parser`, `protobufjs`
- `ip-address`, `uuid`, `ws`

`uuid` and `ws` were explicitly kept after a trial removal caused the resolver to reintroduce `uuid@10.0.0` through `testcontainers` and old optional `ws@6.2.3` through `y-websocket`. Keeping those pins preserves the zero-advisory gate and avoids stale optional WebSocket runtime code.

## Verification

```powershell
pnpm install --lockfile-only
pnpm audit:ci
pnpm type-check
pnpm build:shared
pnpm build:api
pnpm build:web
```

Result: all commands passed. `pnpm audit:ci` reports 0 critical, 0 high, 0 moderate, 0 low, and 0 info advisories.
