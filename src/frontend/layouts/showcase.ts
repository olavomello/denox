/**
 * Showcase layout.
 *
 * Shell for storefront listing pages (product grid): shared header/footer
 * partials, `layout-showcase` body class and full-width content. Customize
 * this file to restyle the storefront without touching other pages.
 */

import type { Context } from "hono";
import { site } from "@/config/site.ts";
import { siteFooter, siteHeader } from "@/frontend/layouts/partials.ts";

/**
 * Renders the showcase layout.
 *
 * @param _c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export default function showcaseLayout(_c: Context, content: string): string {
  return `<!DOCTYPE html>
<html lang="${site.app.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/assets/js/denox-form.js"></script>
  </head>
  <body class="layout-showcase">
  ${siteHeader()}
  <main>
    <section class="content content-wide">
      ${content}
    </section>
  </main>
  ${siteFooter()}
  </body>
</html>
`;
}
