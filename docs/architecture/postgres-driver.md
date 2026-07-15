# Postgres Driver — Architecture

```
src/config/env.ts            STORAGE_DRIVER gains "postgres"; DATABASE_URL
                             required only then (fail-fast)
src/shared/storage.ts        lazy Pool + requirePool() (null unless postgres)
src/shared/migrate.ts        discover / apply (transactional) / status +
                             _denox_migrations ledger — forward-only
scripts/migrate.ts           deno task migrate[:status]
migrations/0001_init.sql     schema mirroring the domain model
src/api/*/*.repository.postgres.ts   one per slice, same interfaces
```

## Decisions

- **A third option, not a replacement**: the driver switch already existed (memory/kv); Postgres is
  a third branch in each composition root. KV stays first-class — the right choice on Deno Deploy.
- **The interface seam pays off**: adding Postgres touched no service, no controller, no route —
  only new repository classes and one branch per factory. Exactly what interface-based repositories
  were built for.
- **Native constraints over hand-rolled checks**: UNIQUE + ON CONFLICT replaces KV's atomic-check
  dance for email/slug/sku, mapping to the same 409; JSONB carries nested shapes so the domain model
  is untouched.
- **Forward-only migrations**: transactional, idempotent via a ledger table, no down-migrations
  (safe default; rollback is a restore).
- **Gated tests**: the Postgres suite self-skips without TEST_DATABASE_URL, so the default suite
  runs green with zero infrastructure; CI supplies a Postgres service container.
- **Pure-Deno driver** (deno.land/x postgres): Deno Deploy compatible, no native FFI — the
  imagescript lesson applied.
