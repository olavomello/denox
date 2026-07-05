/**
 * Default HTML layout.
 *
 * Provides the default application shell.
 */

import type { Context } from "hono";
import { site } from "@/config/site.ts";

/**
 * Renders the default layout.
 *
 * @param _c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export default function defaultLayout(
  _c: Context,
  content: string,
): string {
  return `<!DOCTYPE html>
<html lang="${site.app.locale}">
  <head>
    <meta charset="UTF-8" />    
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon/favicon-16x16.png">
    <link rel="stylesheet" href="/assets/css/default.css" />
  </head>
  <body>
  <header>
    <div class="container navbar">
      <a
        href="/"
        class="brand"
      >
        <div class="logo"><img src="/images/icon.png" alt="DenoX Framework" width="40" height="40"  /></div>
        <span>DenoX</span>
      </a>
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/users">Users</a>
        <a href="/products">Products</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="content">
      ${content}
    </section>
  </main>
  <footer>
    Powered by <strong><a href="https://github.com/olavomello/denox">DenoX</a></strong>
  </footer>
  </body>
</html>`;
}
