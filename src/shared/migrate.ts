/**
 * Forward-only SQL migrations.
 *
 * Ordered `.sql` files in `migrations/` are applied inside a transaction;
 * a `_denox_migrations` ledger records what ran, so applying is idempotent
 * (a second run is a no-op). No down-migrations by design — forward-only is
 * the safe default; rollback is a documented restore.
 */

import type { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

/** A discovered migration file. */
export interface Migration {
  readonly name: string;
  readonly sql: string;
}

/**
 * Discovers migration files in a directory, ordered by filename.
 *
 * @param dir Migrations directory.
 * @returns Migrations sorted ascending (0001, 0002, ...).
 */
export async function discoverMigrations(dir: string): Promise<Migration[]> {
  const names: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile && entry.name.endsWith(".sql")) names.push(entry.name);
  }
  names.sort();
  const migrations: Migration[] = [];
  for (const name of names) {
    migrations.push({ name, sql: await Deno.readTextFile(`${dir}/${name}`) });
  }
  return migrations;
}

/** Ensures the ledger table exists. */
async function ensureLedger(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.queryObject(
      `CREATE TABLE IF NOT EXISTS _denox_migrations (
         name TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    );
  } finally {
    client.release();
  }
}

/** @returns Names of migrations already applied. */
export async function appliedMigrations(pool: Pool): Promise<Set<string>> {
  await ensureLedger(pool);
  const client = await pool.connect();
  try {
    const result = await client.queryObject<{ name: string }>(
      "SELECT name FROM _denox_migrations",
    );
    return new Set(result.rows.map((row) => row.name));
  } finally {
    client.release();
  }
}

/** Result of an apply run. */
export interface MigrateResult {
  readonly applied: readonly string[];
  readonly skipped: readonly string[];
}

/**
 * Applies pending migrations in order, each inside a transaction, and
 * records them. Idempotent: already-applied files are skipped.
 *
 * @param pool Connection pool.
 * @param dir Migrations directory.
 * @returns What was applied and what was skipped.
 */
export async function migrate(pool: Pool, dir: string): Promise<MigrateResult> {
  const migrations = await discoverMigrations(dir);
  const done = await appliedMigrations(pool);
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const migration of migrations) {
    if (done.has(migration.name)) {
      skipped.push(migration.name);
      continue;
    }
    const client = await pool.connect();
    try {
      const tx = client.createTransaction(`migrate_${migration.name.replace(/\W/g, "_")}`);
      await tx.begin();
      await tx.queryObject(migration.sql);
      await tx.queryObject("INSERT INTO _denox_migrations (name) VALUES ($1)", [migration.name]);
      await tx.commit();
      applied.push(migration.name);
    } finally {
      client.release();
    }
  }
  return { applied, skipped };
}

/** Status of every discovered migration. */
export async function migrationStatus(
  pool: Pool,
  dir: string,
): Promise<{ name: string; applied: boolean }[]> {
  const migrations = await discoverMigrations(dir);
  const done = await appliedMigrations(pool);
  return migrations.map((m) => ({ name: m.name, applied: done.has(m.name) }));
}
