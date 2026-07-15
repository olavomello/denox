# Postgres

Postgres is a third storage driver, alongside `memory` (dev default) and `kv` (native on Deno
Deploy). It is opt-in — KV remains a first-class choice — and reached for when a project outgrows
key-value.

## Enabling it

```bash
# .env
STORAGE_DRIVER=postgres
DATABASE_URL=postgres://user:password@localhost:5432/denox
```

`DATABASE_URL` is required **only** under this driver; with `memory`/`kv` the Postgres client is
never loaded (fail-fast on a missing URL, the payments-keys pattern). Run the migrations, then start
the app:

```bash
deno task migrate          # apply pending migrations
deno task migrate:status   # list applied (✓) / pending (·)
deno task dev
```

## Migrations

Forward-only, ordered `.sql` files in `migrations/`. Each runs inside a transaction; a
`_denox_migrations` table records what ran, so `deno task
migrate` is idempotent — a second run is a
no-op, and only new files apply. There are no down-migrations by design (forward-only is the safe
default; rollback is a manual restore). Add one by dropping a higher-numbered file:

```
migrations/0002_add_orders.sql
```

## What maps where

The relational schema mirrors the domain model the other drivers already serve: uniqueness that KV
enforced with atomic checks (`email`, `slug`, `sku`) becomes native `UNIQUE` constraints
(`ON CONFLICT` → the same 409); nested shapes (product images, payment `productSnapshot` and the
`transitions` audit trail) live in `JSONB` columns, so nothing in the domain model changes when you
switch drivers.

## Deno Deploy

Deno Deploy can attach a managed Postgres; set `STORAGE_DRIVER=postgres` and the provided
`DATABASE_URL` in the project's environment variables, and run `deno task migrate` once against it.
