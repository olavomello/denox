# Cron Jobs — Implementation Plan

1. `CronJob` contract + empty registry.
2. Scheduler engine (injectable, instrumented, fail-fast, graceful).
3. `crons.enabled` config section; boot wiring in `main.ts`; `unstable: ["cron", "kv"]`; check task
   covers `src/crons/`.
4. Three `.example.ts` recipes (daily report functional; pricing and catalog sync skeletons).
5. Unit tests via mock scheduler (registration, flags, duplicates, containment, empty registry) +
   config toggle test.
6. Docs (`docs/cron-jobs.md`), guide third-entry mention, CHANGELOG.

Definition of done: `deno task ci` green; spec acceptance criteria covered.
