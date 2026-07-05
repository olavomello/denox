/**
 * Resolved project configuration singleton.
 *
 * Loads the root `denox.config.ts` (the developer-facing configuration file,
 * following the convention of next.config.js / vite.config.ts) already
 * resolved through `defineConfig`. Framework modules import `site` from here
 * — never the root file directly — so the loading strategy can evolve
 * without touching call sites.
 */

import type { DenoxConfig } from "@/config/define_config.ts";
import config from "../../denox.config.ts";

/** Resolved, frozen project configuration. */
export const site: DenoxConfig = config;
