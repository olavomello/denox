# Persistence (memory · KV · Postgres)

DenoX repositories support two storage drivers, selected by environment:

```bash
STORAGE_DRIVER=memory   # default — ephemeral, zero setup (dev/tests)
STORAGE_DRIVER=kv       # Deno KV — durable, native on Deno Deploy
STORAGE_DRIVER=postgres # Postgres — relational, with forward-only migrations
KV_PATH=                # optional: local DB file; empty = runtime default
```

No code changes are needed to switch: services depend on repository interfaces and the composition
roots pick the implementation at startup.

## Deno Deploy

Set `STORAGE_DRIVER=kv` in the project environment variables — the KV store is ambient and managed
(leave `KV_PATH` empty). Users, products and contact messages then survive deploys and instance
hops.

## Local / VPS

`STORAGE_DRIVER=kv` with `KV_PATH=./data/denox.kv` (add the folder to your backup routine). The CLI
needs the `kv` unstable feature, already enabled via `deno.json` (`"unstable": ["kv"]`).

## Guarantees

- User e-mail uniqueness is enforced **atomically** (entity + index committed in one transaction) —
  concurrent duplicates receive 409 `CONFLICT`.
- `deno task seed` inserts sample users/products idempotently on any driver.

## What stays the same

The in-memory driver remains the default; behavior, API and tests are unchanged when
`STORAGE_DRIVER` is unset.

Postgres is a first-class third option behind the same repository interfaces — see
[docs/postgres.md](postgres.md) for enabling it, the `DATABASE_URL` contract, and the migrations
workflow. KV stays a peer (the right choice on Deno Deploy); Postgres is for projects that need SQL.
