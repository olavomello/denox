/**
 * Storage handles.
 *
 * Opens the Deno KV database once at startup when (and only when) the
 * configured storage driver is `kv` — the default `memory` driver never
 * touches KV, so unit tests and development keep running with zero flags
 * beyond the project defaults. Repository factories in the feature
 * composition roots consume {@link requireKv}.
 */

import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
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

/**
 * Postgres connection pool, or null unless the Postgres driver is active.
 * Lazily created so memory/kv deployments never load the driver or open a
 * connection. Pool size 8 is a sane default (no tuning knobs yet).
 */
export const pool: Pool | null = env.STORAGE_DRIVER === "postgres"
  ? new Pool(env.DATABASE_URL, 8, true)
  : null;

/**
 * Returns the Postgres pool, failing loudly if the driver is misconfigured.
 *
 * @returns Connection pool.
 */
export function requirePool(): Pool {
  if (pool === null) {
    throw new Error(
      "Postgres is not configured: set STORAGE_DRIVER=postgres and DATABASE_URL (see .env.example)",
    );
  }
  return pool;
}
