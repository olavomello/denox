/**
 * EXAMPLE LAYOUT — Editorial (magazine).
 *
 * Design idea: long-form reading comfort — serif display type, a centered
 * measure-width column, generous whitespace and hairline rules. The whole
 * chrome quiets down so content leads.
 *
 * Try it: set `layout: "editorial"` in any page config.
 * Adopt it: copy this file out of examples/, rename, register, customize.
 * Styles are fully scoped under `.layout-editorial` — nothing bleeds.
 */

import type { Context } from "hono";
import type { UiConfig } from "@/config/define_config.ts";
import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";

/**
 * Renders the editorial document for the given UI identity.
 * Exported separately so tests can inject arbitrary (hostile) ui values.
 *
 * @param ui Site identity data.
 * @param _c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export function render(ui: UiConfig, _c: Context, content: string): string {
  const nav = ui.nav
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("\n        ");
  return `<!DOCTYPE html>
<html lang="${site.app.locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" src="/assets/js/denox-form.js"></script>
    <style>
      .layout-editorial { margin: 0; background: #faf8f5; color: #21201d; font-family: Georgia, "Times New Roman", serif; }
      .layout-editorial .ed-header { text-align: center; padding: 40px 20px 22px; border-bottom: 1px solid #d8d3ca; }
      .layout-editorial .ed-brand { color: #21201d; text-decoration: none; font-size: 2rem; font-weight: 700; letter-spacing: 0.01em; display: inline-flex; align-items: center; gap: 12px; }
      .layout-editorial .ed-brand img { width: 34px; height: 34px; }
      .layout-editorial nav { margin-top: 16px; display: flex; justify-content: center; gap: 26px; flex-wrap: wrap; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.14em; }
      .layout-editorial nav a { color: #6b6357; text-decoration: none; }
      .layout-editorial nav a:hover { color: #21201d; border-bottom: 1px solid #21201d; }
      .layout-editorial .ed-main { max-width: 68ch; margin: 0 auto; padding: 56px 22px 80px; font-size: 1.12rem; line-height: 1.75; }
      .layout-editorial .ed-main h1 { font-size: 2.6rem; line-height: 1.15; margin: 0 0 26px; font-weight: 700; }
      .layout-editorial .ed-main a { color: #8a4b2d; }
      .layout-editorial .ed-footer { border-top: 1px solid #d8d3ca; text-align: center; padding: 26px 20px 46px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.8rem; color: #6b6357; }
      .layout-editorial .ed-footer a { color: #21201d; }
    </style>
  </head>
  <body class="layout-editorial">
  <header class="ed-header">
    <a href="${escapeHtml(ui.brand.href)}" class="ed-brand">
      <img src="${escapeHtml(ui.brand.logo)}" alt="${
    escapeHtml(ui.brand.label)
  }" width="34" height="34" />
      <span>${escapeHtml(ui.brand.label)}</span>
    </a>
    <nav>
        ${nav}
    </nav>
  </header>
  <main class="ed-main">
    ${content}
  </main>
  <footer class="ed-footer">
    ${escapeHtml(ui.footer.text)} <a href="${escapeHtml(ui.footer.href)}">${
    escapeHtml(ui.footer.label)
  }</a>
  </footer>
  </body>
</html>
`;
}

/**
 * Editorial layout entry point (registry signature).
 *
 * @param c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export default function editorialLayout(c: Context, content: string): string {
  return render(site.ui, c, content);
}
