/**
 * Cron job contract.
 *
 * Scheduled tasks are the third DenoX entry point (HTTP → api, browser →
 * frontend, clock → crons). A job is a plain module exporting this shape,
 * activated by one line in `src/crons/registry.ts`. Handlers call the
 * service layer directly — never HTTP-to-self.
 */

/** A scheduled task definition. */
export interface CronJob {
  /** Unique job name (shown in logs and the Deno Deploy Cron tab). */
  readonly name: string;
  /** Cron expression (e.g. "0 8 * * *" — minute hour day month weekday). */
  readonly schedule: string;
  /** Work to perform on each tick. Thrown errors are logged, never fatal. */
  readonly handler: () => void | Promise<void>;
  /** Set false to keep the job registered but unscheduled. Default true. */
  readonly enabled?: boolean;
}
