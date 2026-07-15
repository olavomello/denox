/**
 * `deno task migrate` — applies pending migrations.
 * `deno task migrate:status` — lists applied/pending.
 */

import { requirePool } from "@/shared/storage.ts";
import { migrate, migrationStatus } from "@/shared/migrate.ts";

const DIR = "migrations";

if (import.meta.main) {
  const pool = requirePool();
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
  await pool.end();
}
