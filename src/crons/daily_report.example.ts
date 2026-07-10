/**
 * RECIPE — Daily summary report (fully functional).
 *
 * Consolidates the products and contact messages created in the last 24
 * hours and emits a structured summary log every day at 08:00. Extend the
 * handler to deliver by e-mail or webhook.
 *
 * Activate: rename this file to `daily_report.ts` and register it in
 * `src/crons/registry.ts`.
 */

import type { CronJob } from "@/crons/types.ts";
import { contactService } from "@/api/contact/contact.routes.ts";
import { productService } from "@/api/products/product.routes.ts";
import { logger } from "@/shared/logger.ts";

const DAY_MS = 86_400_000;

/** Daily 08:00 summary of new products and contact messages. */
const dailyReport: CronJob = {
  name: "daily-report",
  schedule: "0 8 * * *",
  handler: async () => {
    const since = Date.now() - DAY_MS;
    const isRecent = (createdAt: string): boolean => Date.parse(createdAt) >= since;

    const products = (await productService.list()).filter((p) => isRecent(p.createdAt));
    const messages = (await contactService.list()).filter((m) => isRecent(m.createdAt));

    logger.info("Daily report", {
      newProducts: products.length,
      newContactMessages: messages.length,
      // Extension point: send this payload by e-mail or webhook instead.
    });
  },
};

export default dailyReport;
