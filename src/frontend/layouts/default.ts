/**
 * Default HTML layout.
 *
 * Wraps rendered page content in the site shell. Dynamic values must be
 * escaped with `escapeHtml` before interpolation.
 */

import type { Context } from "hono";

/**
 * Renders the default document shell around page content.
 *
 * @param _c Request context (available for locale, auth, etc.).
 * @param content Already-rendered (and escaped) page HTML.
 * @returns Complete HTML document.
 */
export default function defaultLayout(_c: Context, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DenoX</title>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a> ·
      <a href="/about">About</a> ·
      <a href="/users">Users</a> ·
      <a href="/products">Products</a>
    </nav>
  </header>
  <main>
${content}
  </main>
  <footer>
    <p>Powered by DenoX</p>
  </footer>
</body>
</html>
`;
}
