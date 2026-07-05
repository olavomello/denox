/**
 * HTML escaping helpers.
 *
 * Every dynamic value interpolated into an HTML template string MUST go
 * through {@link escapeHtml} to prevent XSS. Layouts and pages never
 * interpolate raw user input.
 */

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapes a value for safe interpolation into HTML content or attributes.
 *
 * @param value Untrusted value to escape.
 * @returns HTML safe string.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}
