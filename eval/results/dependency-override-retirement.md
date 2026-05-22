# Dependency Override Retirement Pass

Run date: 2026-05-22

## Goal

Reduce maintenance overhead from Phase 08 dependency-security overrides without reintroducing audit advisories.

## Retired Overrides

Removed 26 overrides whose patched versions are now supplied by direct package ranges, updated parent package ranges, or the refreshed lockfile:

- `@hono/node-server`
- `@protobufjs/utf8`
- `ajv`
- `brace-expansion`
- `express-rate-limit`
- `fast-uri`
- `fast-xml-parser`
- `flatted`
- `hono`
- `ip-address`
- `lodash`
- `markdown-it`
- `minimatch@5.1.6`
- `minimatch@9.0.5`
- `path-to-regexp@0.1.12`
- `path-to-regexp@8.3.0`
- `picomatch@2.3.1`
- `picomatch@4.0.3`
- `postcss`
- `protobufjs`
- `qs`
- `rollup`
- `svgo`
- `undici`
- `vite`
- `yaml`

The second pass refreshed direct parent ranges for the AWS SDK clients to `^3.1052.0` and `@modelcontextprotocol/sdk` to `^1.29.0`, allowing the lockfile to resolve patched transitive packages without long-lived root pins.

## Retained Overrides

The remaining 2 overrides avoid known resolver backslides:

- `uuid`
- `ws`

`uuid` and `ws` were explicitly kept after a trial removal caused the resolver to reintroduce `uuid@10.0.0` through `testcontainers` and old optional `ws@6.2.3` through `y-websocket`. Keeping those pins preserves the zero-advisory gate and avoids stale optional WebSocket runtime code.

## Verification

```powershell
pnpm install --lockfile-only
pnpm install
pnpm audit:ci
pnpm type-check
pnpm build:api
pnpm build:web
```

Result: all commands passed. `pnpm audit:ci` reports 0 critical, 0 high, 0 moderate, 0 low, and 0 info advisories.
