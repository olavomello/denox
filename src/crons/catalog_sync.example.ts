/**
 * RECIPE — External catalog sync (skeleton).
 *
 * Keeps the storefront honest against a supplier/ERP: every 30 minutes,
 * fetch prices and availability from the external source and update the
 * products through the service layer.
 *
 * Activate: rename to `catalog_sync.ts`, point it at your source and
 * register it in `src/crons/registry.ts`.
 */

import type { CronJob } from "@/crons/types.ts";
import { logger } from "@/shared/logger.ts";

/** Half-hourly catalog synchronization. */
const catalogSync: CronJob = {
  name: "catalog-sync",
  schedule: "*/30 * * * *",
  handler: () => {
    // 1. const rows = await (await fetch("https://erp.example.com/catalog")).json();
    // 2. Map external rows to your products (by SKU/name).
    // 3. await productService.updateDetails(id, { price: row.price });
    //    (create/delete as your business rules dictate)
    logger.info("Catalog sync tick (implement your external source)");
  },
};

export default catalogSync;
