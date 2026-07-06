# Persistence Layer (Deno KV) — Implementation Plan

1. Env: `STORAGE_DRIVER` (enum, default memory) + `KV_PATH`; unit tests.
2. `shared/storage.ts` (conditional top-level open + `requireKv`).
3. KV repositories (users with atomic index, products, contact).
4. Factories in the three composition roots; `deno.json` `unstable: ["kv"]`.
5. `scripts/seed.ts` + `deno task seed` (idempotent, driver-agnostic).
6. Tests: integration on `:memory:` KV (CRUD, sequential + concurrent uniqueness); e2e booting the
   real server as a subprocess with the KV driver; existing suite untouched.
7. Docs, `.env.example`, CHANGELOG 0.3.0, VERSION, README, ROADMAP.

Definition of done: `deno task ci` green; spec acceptance criteria covered.
