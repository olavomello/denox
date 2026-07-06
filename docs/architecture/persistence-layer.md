# Persistence Layer (Deno KV) — Architecture

## Components

```
src/config/env.ts                 + STORAGE_DRIVER (memory|kv), KV_PATH
src/shared/storage.ts             KV handle: opened once iff driver=kv; requireKv()
src/api/*/x.repository.kv.ts      KV implementations beside the in-memory ones
src/api/*/x.routes.ts             + createXRepository() factory (composition root)
scripts/seed.ts                   idempotent sample data via the same factories
deno.json                         "unstable": ["kv"] (ambient on Deno Deploy)
```

## Dependency direction (unchanged guarantees)

Services keep depending on the repository **interfaces**; only the factories in the composition
roots know concrete classes. No service, controller, DTO or pre-existing test changed.

## Key layout

```
["users", id] → User          ["users_by_email", email] → id  (unique index)
["products", id] → Product    ["contact", id] → ContactMessage
```

## E-mail uniqueness (atomic)

`KvUserRepository.create` commits entity + index in one transaction guarded by
`check(versionstamp: null)` on the index key; a failed commit throws the existing
`ConflictException`. The service-level pre-check remains as the friendly fast path; the transaction
is the correctness guarantee under concurrency (verified by test with `Promise.all`).

## Startup semantics

`storage.ts` opens KV with top-level await only under `STORAGE_DRIVER=kv` (`KV_PATH` empty = runtime
default location; `:memory:` for tests). The default `memory` driver never opens KV — unit tests
keep running without extra permissions.

## Risks

- `findAll` is a prefix scan (fine at current scale; pagination arrives with a future query-API
  spec).
- KV local file must be writable/backed up in VPS deploys (documented); on Deno Deploy the store is
  managed.
- In-memory rate limiter remains per-instance (KV/Redis store tracked for 1.0).
