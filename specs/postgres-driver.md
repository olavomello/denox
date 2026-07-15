---
feature: postgres-driver
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-13
---

# Postgres Driver + Migrations — Specification (1.0)

## Objective

Add a **Postgres** storage driver as a first-class option alongside memory and KV — the relational
tier a production project reaches for when it outgrows key-value — plus a **migrations** system to
version the schema. KV stays a peer, not a casualty: it remains the right choice on Deno Deploy.
This is the enchufe the interface-based repositories were built for since day one; adding Postgres
is filling a slot, not a rewrite.

## Scope

### In scope

**1. `STORAGE_DRIVER=postgres` — a third option**

- `env.ts` accepts `postgres`; `DATABASE_URL` becomes required only when that driver is selected
  (fail-fast otherwise, the payments-keys pattern).
- `src/shared/storage.ts` gains a lazily-opened pool (`requirePool()`, mirroring `requireKv()`),
  null under memory/kv so those paths stay zero-dependency.
- Driver library: `postgres` (deno.land/x — pure Deno, Deno Deploy compatible; no native FFI, the
  imagescript lesson).

**2. Postgres repositories — one per existing slice**

`Postgres{User,Product,Payment,Contact}Repository` implementing the same interfaces the memory/KV
drivers already satisfy. The factories in each slice's composition root select on
`env.STORAGE_DRIVER` (a third branch). Parity with existing behaviour is the bar:

- atomic uniqueness (email, slug, sku) via UNIQUE constraints + `ON CONFLICT` — the DB does natively
  what KV did with atomic checks;
- JSON columns for nested shapes (product images, payment `productSnapshot`/`transitions`) so the
  domain model is unchanged;
- the payment transition audit trail and `refundedCents` persist as-is.

**3. Migrations — `migrations/` + `deno task migrate`**

- Plain, ordered `.sql` files (`0001_init.sql`, `0002_...`), applied in order inside a transaction;
  a `_denox_migrations` table records what ran (idempotent — re-running applies only the new ones).
- `deno task migrate` (apply pending) and `deno task migrate:status` (list applied/pending). No
  down-migrations in this cycle (forward-only is the safe default; rollback is a documented manual
  restore).
- `0001_init.sql` creates every table the four repositories need, with the uniqueness constraints
  and indexes the KV driver implied.

**4. Contract & docs**

`docs/postgres.md` (enabling the driver, DATABASE_URL, running migrations, the Deno Deploy "+Attach
Postgres" path), `persistence-layer` doc updated to three drivers, `AGENTS.md` storage section,
`.env.example` gains `DATABASE_URL`, README feature bullet.

### Out of scope

MySQL / any second SQL dialect (roadmap item if demand appears — this cycle does NOT pre-build a
generic SQL base; it ships Postgres cleanly); down-migrations / rollback tooling; connection-pool
tuning knobs beyond a sane default; read replicas; an ORM or query builder (hand-written SQL, the
no-dependency-bloat house style); migrating existing KV data into Postgres (a one-off script is out
of scope — new deployments choose a driver up front).

## Functional Requirements

- FR-1: with `STORAGE_DRIVER=postgres` + a valid `DATABASE_URL`, all four slices work end to end
  (the existing integration suites pass against Postgres).
- FR-2: selecting `postgres` without `DATABASE_URL` fails fast at boot with a clear message;
  memory/kv are unaffected and need no PG env.
- FR-3: uniqueness is enforced by the DB — duplicate email/slug/sku → the same 409 the KV driver
  produces.
- FR-4: `deno task migrate` applies pending migrations in order, records them, and is idempotent (a
  second run is a no-op); `migrate:status` reports accurately.
- FR-5: nested shapes (images, snapshot, transitions) round-trip through JSON columns unchanged.
- FR-6: memory and KV drivers keep working with zero Postgres dependency loaded (the pool is null,
  nothing connects).

## Non Functional Requirements

- NFR-1: pure-Deno driver, Deno Deploy compatible (no native FFI).
- NFR-2: memory/kv paths stay zero-dependency — the pg import is only reached under
  `STORAGE_DRIVER=postgres`.
- NFR-3: the suite stays green **without a Postgres server**: Postgres integration tests self-skip
  when `TEST_DATABASE_URL` is unset (like the gated wasm test), and CI runs them against a Postgres
  service container. Everything else runs on memory as today.

## Security Considerations

`DATABASE_URL` carries credentials — it is an env var (never committed; `.env.example` shows the
shape with a placeholder), never logged, never placed in error messages surfaced to clients. SQL is
parameterized throughout (no string interpolation of user input — the injection guard). Migrations
run inside a transaction so a failed migration leaves no partial schema.

## Tests

Unit: migration-file discovery/ordering, the `_denox_migrations` ledger logic, DATABASE_URL
fail-fast. Integration (gated on `TEST_DATABASE_URL`): the four repositories against real Postgres —
CRUD, atomic uniqueness (409 on conflict), JSON round-trips, the payment transition trail; plus
`migrate` applying + being idempotent. Memory-backed suites unchanged. Estimated +14–18 tests (most
gated).

## Documentation

`docs/postgres.md`, `docs/persistence-layer.md` (three drivers), architecture doc, plan, `AGENTS.md`
storage section, `.env.example`, README (driver list + "Durable storage" bullet), CHANGELOG, ROADMAP
(Postgres checked off; MySQL noted as a possible follow-up), and CI workflow gains a Postgres
service for the gated suite.
