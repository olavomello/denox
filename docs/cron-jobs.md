# Cron Jobs (Scheduled Tasks)

The third DenoX entry point: HTTP hits `src/api/`, browsers hit `src/frontend/`, the clock hits
`src/crons/`. Jobs call the service layer directly — never HTTP-to-self — powered by the native
`Deno.cron` API.

## Creating a job

```ts
// src/crons/daily_report.ts
import type { CronJob } from "@/crons/types.ts";

const dailyReport: CronJob = {
  name: "daily-report", // unique; shown in logs and the Deploy Cron tab
  schedule: "0 8 * * *", // cron expression
  handler: async () => {/* call your services here */},
  enabled: true, // optional; false keeps it unscheduled
};
export default dailyReport;
```

Activate it with one line in `src/crons/registry.ts`. A fresh project schedules **zero** jobs — the
framework ships the mechanism, not opinions.

## Recipes

Three inert examples live in `src/crons/` with the `.example.ts` suffix (the registry ignores them;
activating = rename + register):

- `daily_report.example.ts` — functional: last-24h products + contact messages summarized in a
  structured log (extend to e-mail/webhook).
- `scheduled_pricing.example.ts` — skeleton: activate/expire promotions by adjusting prices on
  schedule.
- `catalog_sync.example.ts` — skeleton: sync prices/stock from an external ERP/supplier through
  `productService`.

## Guarantees

- Handler errors are caught and logged (name, duration, message) — one failing job never kills the
  process or other jobs.
- Duplicate names abort startup (fail fast); `crons.enabled: false` in `denox.config.ts` disables
  scheduling globally.
- Runtimes without `Deno.cron` boot normally with an informative log.

## Production

On Deno Deploy, executions are managed and deduplicated by the platform and monitored in the app's
**Cron** tab. Self-hosted with multiple replicas: each replica schedules independently — enable
crons on a single designated instance via the config toggle (a KV-based distributed lock is a
tracked future extension).
