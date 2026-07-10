/**
 * Unit tests — cron scheduling engine (src/crons/scheduler.ts).
 * Uses an injected mock scheduler: Deno.cron is never invoked, so tests
 * create no real OS-level schedules.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { registerCronJobs } from "@/crons/scheduler.ts";
import type { CronJob } from "@/crons/types.ts";

/** Records scheduled jobs and captures their instrumented handlers. */
function mockScheduler() {
  const scheduled: { name: string; schedule: string; handler: () => void | Promise<void> }[] = [];
  return {
    scheduled,
    fn: (name: string, schedule: string, handler: () => void | Promise<void>) => {
      scheduled.push({ name, schedule, handler });
    },
  };
}

const noop: CronJob = { name: "noop", schedule: "* * * * *", handler: () => {} };

Deno.test("registerCronJobs schedules enabled jobs and returns the count", () => {
  const mock = mockScheduler();
  const count = registerCronJobs({
    jobs: [noop, { ...noop, name: "second", schedule: "0 8 * * *" }],
    scheduler: mock.fn,
    enabled: true,
  });
  assertEquals(count, 2);
  assertEquals(mock.scheduled[1]?.name, "second");
  assertEquals(mock.scheduled[1]?.schedule, "0 8 * * *");
});

Deno.test("per-job enabled:false and the global toggle skip scheduling", () => {
  const mock = mockScheduler();
  const count = registerCronJobs({
    jobs: [noop, { ...noop, name: "off", enabled: false }],
    scheduler: mock.fn,
    enabled: true,
  });
  assertEquals(count, 1);

  const globallyOff = registerCronJobs({ jobs: [noop], scheduler: mock.fn, enabled: false });
  assertEquals(globallyOff, 0);
});

Deno.test("duplicate job names abort registration (fail fast)", () => {
  const mock = mockScheduler();
  assertThrows(
    () =>
      registerCronJobs({
        jobs: [noop, { ...noop }],
        scheduler: mock.fn,
        enabled: true,
      }),
    Error,
  );
});

Deno.test("a runtime without Deno.cron boots gracefully (scheduler null)", () => {
  const count = registerCronJobs({ jobs: [noop], scheduler: null, enabled: true });
  assertEquals(count, 0);
});

Deno.test("handler errors are contained by the instrumentation wrapper", async () => {
  const mock = mockScheduler();
  registerCronJobs({
    jobs: [{
      name: "explosive",
      schedule: "* * * * *",
      handler: () => {
        throw new Error("boom");
      },
    }],
    scheduler: mock.fn,
    enabled: true,
  });
  // The wrapped handler must resolve (log the failure) instead of throwing.
  await mock.scheduled[0]?.handler();
});

Deno.test("the default registry ships empty (fresh projects schedule nothing)", async () => {
  const { cronJobs } = await import("@/crons/registry.ts");
  assertEquals(cronJobs.length, 0);
});
