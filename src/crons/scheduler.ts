/**
 * Cron scheduling engine.
 *
 * Registers the jobs from the registry with the native `Deno.cron` API at
 * boot (called from src/main.ts — never from app.ts, so HTTP tests import
 * the app without creating schedules). The scheduler is injectable for
 * tests, validation is fail-fast, and handler errors are contained: a
 * failing job is logged and never affects the server or other jobs.
 */

import { cronJobs } from "@/crons/registry.ts";
import type { CronJob } from "@/crons/types.ts";
import { site } from "@/config/site.ts";
import { logger } from "@/shared/logger.ts";

/** Scheduling function signature (matches `Deno.cron`). */
export type CronScheduler = (
  name: string,
  schedule: string,
  handler: () => void | Promise<void>,
) => void;

/** Options for {@link registerCronJobs}; every field defaults sensibly. */
export interface RegisterCronOptions {
  /** Jobs to schedule. Default: the registry. */
  readonly jobs?: readonly CronJob[];
  /** Scheduler implementation, or null when unavailable. Default: Deno.cron. */
  readonly scheduler?: CronScheduler | null;
  /** Global toggle. Default: `crons.enabled` from denox.config.ts. */
  readonly enabled?: boolean;
}

/** Resolves the native scheduler when the runtime provides it. */
function nativeScheduler(): CronScheduler | null {
  const maybeDeno = globalThis as { Deno?: { cron?: CronScheduler } };
  return typeof maybeDeno.Deno?.cron === "function"
    ? maybeDeno.Deno.cron.bind(maybeDeno.Deno)
    : null;
}

/** Wraps a handler with structured logging and error containment. */
function instrument(job: CronJob): () => Promise<void> {
  return async () => {
    const startedAt = performance.now();
    logger.debug("Cron job started", { job: job.name });
    try {
      await job.handler();
      logger.info("Cron job finished", {
        job: job.name,
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (error) {
      logger.error("Cron job failed", {
        job: job.name,
        durationMs: Math.round(performance.now() - startedAt),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

/**
 * Schedules every enabled job. Fail-fast on duplicate names; graceful when
 * crons are disabled or the runtime lacks `Deno.cron`.
 *
 * @param options Optional overrides (jobs, scheduler, toggle) — used by
 * tests to avoid real OS-level schedules.
 * @returns Number of jobs actually scheduled.
 */
export function registerCronJobs(options: RegisterCronOptions = {}): number {
  const jobs = options.jobs ?? cronJobs;
  const enabled = options.enabled ?? site.crons.enabled;
  const scheduler = options.scheduler !== undefined ? options.scheduler : nativeScheduler();

  if (!enabled) {
    logger.info("Cron scheduling disabled (crons.enabled = false)");
    return 0;
  }
  if (scheduler === null) {
    if (jobs.length > 0) {
      logger.info("Cron scheduling unavailable on this runtime; jobs skipped", {
        jobs: jobs.length,
      });
    }
    return 0;
  }

  const seen = new Set<string>();
  let scheduled = 0;

  for (const job of jobs) {
    if (seen.has(job.name)) {
      throw new Error(`Duplicate cron job name "${job.name}" — names must be unique`);
    }
    seen.add(job.name);

    if (job.enabled === false) {
      logger.info("Cron job skipped (disabled)", { job: job.name });
      continue;
    }

    scheduler(job.name, job.schedule, instrument(job));
    logger.info("Cron job scheduled", { job: job.name, schedule: job.schedule });
    scheduled += 1;
  }

  return scheduled;
}
