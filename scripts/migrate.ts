/**
 * `deno task migrate` — applies pending migrations.
 * `deno task migrate:status` — lists applied/pending.
 *
 * `DATABASE_URL` is read from the environment. Both scenarios just work:
 *   - **Local**: `--env-file=.env` loads it from `.env` (the flag only
 *     warns, never aborts, when the file is absent).
 *   - **Deno Deploy / tunnel**: the platform injects `DATABASE_URL`
 *     automatically, so the missing-`.env` warning is harmless.
 */

import { requirePool } from "@/shared/storage.ts";
import { migrate, migrationStatus } from "@/shared/migrate.ts";
import { env } from "@/config/env.ts";

const DIR = "migrations";

/** Prints a friendly hint instead of the driver's raw stack trace. */
function explain(error: unknown): never {
  const message = String(error);
  if (env.STORAGE_DRIVER !== "postgres") {
    console.error("Migrations need the Postgres driver: set STORAGE_DRIVER=postgres");
  } else if (message.includes("Missing connection parameters") || message.includes("database")) {
    console.error(
      "Could not connect: check DATABASE_URL is a full Postgres URL\n" +
        "  postgres://user:password@host:5432/database?sslmode=require\n" +
        "On Deno Deploy the URL is injected automatically (copy the direct\n" +
        "connection string from the database's URL button if running locally).",
    );
  } else {
    console.error(`Migration failed: ${message}`);
  }
  Deno.exit(1);
}

if (import.meta.main) {
  let pool;
  try {
    pool = requirePool();
  } catch (error) {
    explain(error);
  }
  try {
    if (Deno.args[0] === "status") {
      for (const { name, applied } of await migrationStatus(pool, DIR)) {
        console.log(`  ${applied ? "✓" : "·"} ${name}`);
      }
    } else {
      const { applied, skipped } = await migrate(pool, DIR);
      for (const name of applied) console.log(`  applied ${name}`);
      console.log(
        applied.length === 0
          ? `Up to date (${skipped.length} already applied).`
          : `Applied ${applied.length} migration(s).`,
      );
    }
  } catch (error) {
    explain(error);
  } finally {
    await pool.end();
  }
}
