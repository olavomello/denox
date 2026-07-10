/**
 * URL slug helpers.
 *
 * Turns arbitrary names into URL-friendly, allowlist-safe slugs. Pure
 * functions — uniqueness (which requires persistence) is enforced by the
 * repositories through their secondary indexes.
 */

/** Maximum slug length. */
export const SLUG_MAX_LENGTH = 80;

/** Strict slug shape accepted from user input. */
export const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

/**
 * Derives a slug from a human name: lowercase, accents stripped (NFD),
 * non-alphanumerics collapsed to single hyphens, trimmed to
 * {@link SLUG_MAX_LENGTH}.
 *
 * @param name Source name.
 * @param fallback Used when nothing slug-worthy remains (e.g. "!!!").
 * @returns URL-safe slug.
 */
export function slugify(name: string, fallback = "item"): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, "");
  return slug === "" ? fallback : slug;
}

/**
 * Builds the nth collision-suffixed candidate for a base slug
 * (`base`, `base-2`, `base-3`, ...), respecting the length ceiling.
 *
 * @param base Base slug.
 * @param attempt 1-based attempt number.
 * @returns Candidate slug.
 */
export function slugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = `-${attempt}`;
  return base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/, "") + suffix;
}
