# Cron Jobs — Architecture

## Components

```
src/crons/types.ts        CronJob contract
src/crons/registry.ts     explicit activation (one line per job; empty by default)
src/crons/scheduler.ts    engine: validation, instrumentation, Deno.cron binding
src/crons/*.example.ts    inert recipes (never registered)
src/main.ts               registerCronJobs() at boot — never in app.ts
denox.config.ts           crons.enabled toggle
```

## Design decisions

- **Boot in `main.ts`, not `app.ts`**: HTTP tests import the app without ever creating schedules;
  the e2e subprocess boots with an empty registry.
- **Injectable scheduler** (`CronScheduler` = shape of `Deno.cron`): unit tests exercise
  registration, flags, duplicates and error containment against a mock — no real OS-level schedules,
  deterministic suite.
- **Error containment**: handlers are wrapped with structured logging (name, duration,
  success/error); a throwing job is logged and never affects the server or sibling jobs.
- **Fail fast**: duplicate names abort startup (consistent with env.ts); invalid schedules are
  rejected by `Deno.cron` itself at registration.
- **Graceful degradation**: `crons.enabled: false` or a runtime without `Deno.cron` boots normally
  with an informative log.

## Flow

boot → `registerCronJobs()` → toggle/runtime checks → per job: dedupe → enabled? →
`Deno.cron(name, schedule, instrumented)` → per tick: debug start → handler (services directly) →
info finished / error failed.

## Operational notes

- Deno Deploy: executions platform-managed and deduplicated across isolates; visible in the
  dashboard Cron tab.
- Self-hosted multi-replica: each replica schedules independently — mitigate with `crons.enabled` on
  a single designated instance (KV lock is a future extension).
