/**
 * Storage handles.
 *
 * Opens the Deno KV database once at startup when (and only when) the
 * configured storage driver is `kv` — the default `memory` driver never
 * touches KV, so unit tests and development keep running with zero flags
 * beyond the project defaults. Repository factories in the feature
 * composition roots consume {@link requireKv}.
 */

import { env } from "@/config/env.ts";

/**
 * KV database handle, or null under the in-memory driver.
 * `KV_PATH` selects a local database file (`:memory:` for tests); empty
 * uses the runtime default location (ambient on Deno Deploy).
 */
export const kv: Deno.Kv | null = env.STORAGE_DRIVER === "kv"
  ? await Deno.openKv(env.KV_PATH === "" ? undefined : env.KV_PATH)
  : null;

/**
 * Returns the KV handle, failing loudly if the driver is misconfigured.
 *
 * @returns Open KV database.
 */
export function requireKv(): Deno.Kv {
  if (kv === null) {
    throw new Error("Deno KV is not open: set STORAGE_DRIVER=kv (see .env.example)");
  }
  return kv;
}
