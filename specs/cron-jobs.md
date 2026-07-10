---
feature: cron-jobs
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-09
---

# Cron Jobs (Scheduled Tasks) — Specification

## Objective

Give DenoX a third entry point alongside HTTP (`src/api/`) and the browser
(`src/frontend/`): the clock. Scheduled jobs are plain TypeScript modules in
`src/crons/` that call the existing service layer directly, powered by the
native `Deno.cron()` runtime API — managed and monitored by the Deno Deploy
dashboard ("Cron" tab) in production, zero external dependencies.

The framework ships the **mechanism only**: conventions, registration,
validation, logging and a config toggle. No business jobs run out of the box —
usage recipes ship as inert example files, since every project schedules
different things.

## Scope

### In scope

- `CronJob` contract in `src/crons/types.ts` (or `shared/`):
  `{ name: string; schedule: string; handler: () => void | Promise<void>;
  enabled?: boolean }`.
- `src/crons/registry.ts`: explicit one-line-per-job registration (same pattern
  as `layouts/registry.ts`).
- Boot-time registration in the composition root:
  - Skipped entirely when `crons.enabled` is `false` in `denox.config.ts` (new
    config section, default `true`) or when the runtime lacks `Deno.cron` (e.g.
    non-Deno bundles) — with an informative log line.
  - **Fail-fast validation** at startup: duplicate job names and schedules
    rejected by `Deno.cron` abort the boot (consistent with `env.ts`).
  - Per-execution structured logging through the shared logger: job name, start,
    duration and success/error (errors are caught and logged — one failing job
    never kills the process or other jobs).
- `"cron"` added to `unstable` in `deno.json` (alongside `"kv"`).
- Three inert recipes in `src/crons/` with the `.example.ts` suffix (registry
  does not reference them; activating = rename + one registry line):
  - `daily_report.example.ts` — fully functional: consolidates last-24h products
    and contact messages via `productService`/`contactService` and emits a
    structured summary log (email/webhook left as a documented extension point).
  - `scheduled_pricing.example.ts` — commented skeleton: activate/expire
    promotions by adjusting product prices on schedule.
  - `catalog_sync.example.ts` — commented skeleton: sync prices/stock from an
    external source through `productService`.

### Out of scope

- Distributed locking for multi-replica self-hosted deployments (documented
  caveat; KV-based lock is a future extension).
- Job persistence/history UI (Deno Deploy dashboard covers production).
- Dynamic (runtime) job registration; file-based auto-discovery generator
  (promote from the explicit registry only if the folder grows).

## Functional Requirements

- FR-1: Jobs registered in `registry.ts` are scheduled at boot via
  `Deno.cron(name, schedule, handler)`.
- FR-2: A job with `enabled: false` (or the global `crons.enabled: false`) is
  not scheduled, logged as skipped.
- FR-3: `.example.ts` files are never registered — a fresh project runs zero
  jobs.
- FR-4: A handler that throws is caught, logged as an error with the job name
  and duration, and does not affect other jobs or the server.
- FR-5: Startup fails loudly on duplicate job names.
- FR-6: On runtimes without `Deno.cron`, the app boots normally with a single
  informative log (no crash).

## Non Functional Requirements

- NFR-1: Zero new dependencies (native `Deno.cron`).
- NFR-2: No change to services, controllers, pages or existing tests.
- NFR-3: Jobs consume the service layer directly — never HTTP-to-self.

## Acceptance Criteria

- AC-1: Registering a test job and invoking its wrapped handler produces the
  start/success structured logs; a throwing handler produces the error log and
  does not propagate.
- AC-2: With `crons.enabled: false`, boot schedules nothing.
- AC-3: Duplicate names abort startup with a clear message.
- AC-4: Fresh clone (`deno task ci`) runs green with zero jobs scheduled.
- AC-5: Renaming `daily_report.example.ts` and adding its registry line
  schedules it (verified by unit-level registration test with a mocked
  scheduler).

## Security / Operational Considerations

- Jobs run with the process permissions — no new permission surface.
- Deno Deploy: executions are platform-managed and deduplicated across isolates;
  monitored in the dashboard's Cron tab.
- Self-hosted multi-replica: each replica schedules its own jobs — documented
  caveat with the `crons.enabled` toggle as the mitigation (enable on a single
  designated instance) until a KV lock lands.

## Testing

- Unit: registration wrapper (logging, error containment, enabled flags,
  duplicate detection) against an injected mock scheduler — `Deno.cron` itself
  is not invoked in tests.
- Integration: boot path with `crons.enabled: false`; example files ignored.
- The wrapper takes the scheduler as an injectable dependency
  (`typeof Deno.cron`) precisely so tests never create real OS-level schedules.

## Documentation

`docs/cron-jobs.md` (usage, contract, recipes, Deploy dashboard, caveats), guide
"creating a feature" gains the third entry point mention, CHANGELOG, README
feature bullet + What's New on release.
