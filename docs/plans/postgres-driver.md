# Postgres Driver — Implementation Plan

1. env: `postgres` in STORAGE_DRIVER, DATABASE_URL + fail-fast.
2. storage: lazy Pool + requirePool().
3. migrate.ts: discover/apply/status + _denox_migrations ledger; scripts/migrate.ts + tasks;
   0001_init.sql.
4. Four Postgres repositories implementing the existing interfaces (UNIQUE/ON CONFLICT, JSONB,
   transaction for product+slug).
5. Wire the third branch into all four composition roots.
6. Tests: unit (discovery/ordering, DATABASE_URL fail-fast) + gated integration (migrate
   idempotency, the four repositories) self-skipping without TEST_DATABASE_URL.
7. CI Postgres service; docs (postgres, persistence, guide, architecture, plan), AGENTS.md,
   .env.example, README, CHANGELOG, ROADMAP.
