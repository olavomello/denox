/**
 * Cron job registry.
 *
 * Every ACTIVE scheduled job is listed here — one import + one array entry
 * (same pattern as the layout registry). Files with the `.example.ts`
 * suffix in this folder are inert recipes: to activate one, rename it
 * (dropping `.example`) and add it below. A fresh DenoX project schedules
 * zero jobs.
 */

import type { CronJob } from "@/crons/types.ts";

/** Active scheduled jobs (empty by default — see the .example.ts recipes). */
export const cronJobs: readonly CronJob[] = [
  // import dailyReport from "@/crons/daily_report.ts";
  // dailyReport,
];
