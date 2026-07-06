---
feature: persistence-layer
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-05
---

# Persistence Layer (Deno KV) — Specification

## Objective

Give DenoX durable storage. Repositories gain a **Deno KV** implementation — native on the Deno
Deploy environment where the framework runs in production — selected by configuration, with the
in-memory driver remaining the default for development and tests. Services, controllers, DTOs and
every existing test remain untouched (the repository interfaces already isolate persistence).

Scope decisions approved by the maintainer: KV only in 0.3 (Postgres in 0.3.1); driver selection via
environment; atomic e-mail uniqueness; no migrations (KV is schemaless) — only an optional seed
task.

## Scope

### In scope

- `STORAGE_DRIVER=memory|kv` environment variable (validated, default `memory`) and optional
  `KV_PATH` (local database file / `:memory:` for tests; ignored on Deno Deploy).
- `src/shared/storage.ts`: lazy, memoized `getKv()` singleton.
- KV repository implementations beside their in-memory siblings: `user.repository.kv.ts`,
  `product.repository.kv.ts`, `contact.repository.kv.ts`.
- Per-slice factory (`createUserRepository()` etc. in each `*.routes.ts` composition root) choosing
  the implementation from `env.STORAGE_DRIVER`.
- Atomic e-mail uniqueness for users via a secondary index key checked in a KV transaction.
- `deno task seed`: optional script inserting the development fixtures through the repositories
  (works with either driver).
- `--unstable-kv` flag added to the tasks that boot the app or run tests (`Deno.openKv` is unstable
  in the CLI; enabled by default on Deno Deploy).

### Out of scope

- Postgres driver, migrations tooling (0.3.1).
- KV-backed rate limiting store (tracked for 1.0).
- Pagination/query API on repositories (interfaces unchanged in 0.3).

## Key design

Key layout (all values JSON-serializable entities):

```
["users", id]                → User
["users_by_email", email]    → id          (uniqueness index)
["products", id]             → Product
["contact", id]              → ContactMessage
```

`create(user)` runs one atomic transaction:

```
atomic()
  .check({ key: ["users_by_email", email], versionstamp: null })
  .set(["users", id], user)
  .set(["users_by_email", email], id)
  .commit()
```

A failed commit (index already present) maps to the existing `ConflictException` — closing the
concurrency risk documented in the user-management architecture. `findByEmail` resolves the index
then the primary key; `findAll` uses `list({ prefix })`.

## Functional Requirements

- FR-1: `STORAGE_DRIVER` unset or `memory` → behavior identical to today.
- FR-2: `STORAGE_DRIVER=kv` → users, products and contact messages survive process restarts (local
  file DB) and instance hops (Deno Deploy).
- FR-3: Concurrent user creation with the same e-mail: exactly one succeeds; the other receives 409
  `CONFLICT` (atomic index check).
- FR-4: Invalid `STORAGE_DRIVER` values fail startup (fail-fast, consistent with `env.ts`).
- FR-5: `deno task seed` populates development data idempotently (skips existing e-mails) on either
  driver.

## Non Functional Requirements

- NFR-1: No new external dependencies (Deno KV is runtime-native).
- NFR-2: Zero changes to services, controllers, DTOs, existing tests and the public API surface.
- NFR-3: `getKv()` opens the database once (lazy singleton); no per-request opens.
- NFR-4: Unit tests keep running without KV permissions/flags (memory driver default); KV-specific
  tests use `Deno.openKv(":memory:")`.

## Acceptance Criteria

- AC-1: Full existing suite green with default configuration (no flags on unit tests).
- AC-2: Integration suite exercising the KV driver (`KV_PATH=:memory:`) passes: create/find/list for
  the three entities.
- AC-3: Duplicate e-mail via KV driver returns 409 with code `CONFLICT`, including under two
  concurrent `create` calls (test with `Promise.all`).
- AC-4: Boot with `STORAGE_DRIVER=banana` exits with `EnvValidationError`.
- AC-5: `deno task ci` green.

## Security Considerations

No credentials involved (KV is ambient on Deploy; local file path via env, never hardcoded).
Entities stored as-is — validation continues at the DTO boundary; no query-injection surface
(key-value API). `KV_PATH` documented as a path to protect with filesystem permissions in VPS
deployments.

## Performance Considerations

Primary-key reads O(1); `findAll` streams via prefix list (fine at scaffold scale; pagination
arrives with the query API in a future spec). Atomic transactions add one round trip only on user
creation. `--unstable-kv` has no runtime cost.

## Tests

- Unit: env validation for `STORAGE_DRIVER`/`KV_PATH`; repository factory returns the right
  implementation per driver.
- Integration: KV repositories against `:memory:` KV — CRUD paths, e-mail uniqueness (sequential and
  concurrent), contact persistence; existing memory-driver suite untouched.
- E2E: boot with `STORAGE_DRIVER=kv` + `KV_PATH=:memory:`, create a user over a real socket, fetch
  it back.
