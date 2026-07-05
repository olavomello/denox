/**
 * HTML output optimizations.
 *
 * Pure string transforms applied to page content before layout wrapping.
 * Kept free of I/O and framework types so they can be unit tested directly.
 */

/**
 * Adds `loading="lazy" decoding="async"` to `<img>` tags that do not declare
 * a `loading` attribute. Images with an explicit `loading` value (e.g.
 * `loading="eager"` for above-the-fold/LCP images) are left untouched.
 *
 * Applied to page content only — layout markup (logo, header) is not
 * transformed.
 *
 * @param html Page content HTML.
 * @returns Transformed HTML.
 */
export function lazifyImages(html: string): string {
  return html.replace(
    /<img\b(?![^>]*\bloading=)([^>]*?)(\/?)>/gi,
    '<img loading="lazy" decoding="async"$1$2>',
  );
}
