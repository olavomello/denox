/**
 * Postgres error interpretation.
 *
 * The `deno.land/x/postgres` driver raises a `PostgresError` carrying the
 * server's structured fields — the SQLSTATE `code` and the offending
 * `constraint` name. We key on those rather than substring-matching the
 * serialized message, which is fragile (constraint names and message text
 * vary across versions and locales).
 */

/** SQLSTATE for unique_violation. */
const UNIQUE_VIOLATION = "23505";

/** The structured fields a PostgresError exposes (subset we use). */
interface PgErrorFields {
  code?: string;
  constraint?: string;
}

/** @returns The PostgresError fields when present, else null. */
function pgFields(error: unknown): PgErrorFields | null {
  const fields = (error as { fields?: PgErrorFields })?.fields;
  return fields && typeof fields === "object" ? fields : null;
}

/**
 * @param error A caught error.
 * @param constraint Optional constraint name to match (e.g. "products_sku_key").
 *                   When omitted, matches any unique violation.
 * @returns Whether the error is a unique-constraint violation (optionally
 *          for the given constraint).
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const fields = pgFields(error);
  if (fields?.code !== UNIQUE_VIOLATION) return false;
  return constraint === undefined || fields.constraint === constraint;
}
