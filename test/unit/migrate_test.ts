/**
 * Unit tests — migration discovery/ordering and the DATABASE_URL fail-fast
 * (no database needed).
 */

import { assertEquals, assertThrows } from "@std/assert";
import { discoverMigrations } from "@/shared/migrate.ts";
import { loadEnv } from "@/config/env.ts";

Deno.test("discoverMigrations returns .sql files sorted by name", async () => {
  const dir = await Deno.makeTempDir({ dir: "test" });
  try {
    await Deno.writeTextFile(`${dir}/0002_second.sql`, "SELECT 2;");
    await Deno.writeTextFile(`${dir}/0001_first.sql`, "SELECT 1;");
    await Deno.writeTextFile(`${dir}/notes.txt`, "ignored");
    const migrations = await discoverMigrations(dir);
    assertEquals(migrations.map((m) => m.name), ["0001_first.sql", "0002_second.sql"]);
    assertEquals(migrations[0]?.sql, "SELECT 1;");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("postgres driver requires DATABASE_URL (fail-fast)", () => {
  assertThrows(() => loadEnv({ STORAGE_DRIVER: "postgres" }), Error);
  const memory = loadEnv({ STORAGE_DRIVER: "memory" });
  assertEquals(memory.STORAGE_DRIVER, "memory");
  const withUrl = loadEnv({ STORAGE_DRIVER: "postgres", DATABASE_URL: "postgres://x/y" });
  assertEquals(withUrl.STORAGE_DRIVER, "postgres");
});
