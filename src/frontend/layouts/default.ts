/**
 * Default HTML layout.
 *
 * Site shell for regular pages. Identity (favicons, stylesheets, brand,
 * navigation, footer) comes from the `ui` section of denox.config.ts —
 * favicons and stylesheets are injected by the head builder, header and
 * footer render through the shared partials. Dynamic values must be escaped
 * with `escapeHtml` before interpolation.
 */

import type { Context } from "hono";
import { site } from "@/config/site.ts";
import { siteFooter, siteHeader } from "@/frontend/layouts/partials.ts";

/**
 * Renders the default document shell around page content.
 *
 * @param _c Request context (available for locale, auth, etc.).
 * @param content Already-rendered (and escaped) page HTML.
 * @returns Complete HTML document.
 */
export default function defaultLayout(_c: Context, content: string): string {
  return `<!DOCTYPE html>
<html lang="${site.app.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/assets/js/denox-form.js"></script>
  </head>
  <body>
  ${siteHeader()}
  <main>
    <section class="content">
      ${content}
    </section>
  </main>
  ${siteFooter()}
  </body>
</html>
`;
}
