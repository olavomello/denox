/**
 * Product layout.
 *
 * Shell for the single-product view: shared header/footer partials,
 * breadcrumb back to the showcase, `layout-product` body class and the
 * carousel behavior script. Customize this file to restyle product pages
 * independently of the rest of the site.
 */

import type { Context } from "hono";
import { site } from "@/config/site.ts";
import { siteFooter, siteHeader } from "@/frontend/layouts/partials.ts";

/**
 * Renders the product layout.
 *
 * @param _c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export default function productLayout(_c: Context, content: string): string {
  return `<!DOCTYPE html>
<html lang="${site.app.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/assets/js/denox-form.js"></script>
    <script type="module" src="/assets/js/denox-carousel.js"></script>
  </head>
  <body class="layout-product">
  ${siteHeader()}
  <main>
    <section class="content">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/products">← All products</a>
      </nav>
      ${content}
    </section>
  </main>
  ${siteFooter()}
  </body>
</html>
`;
}
