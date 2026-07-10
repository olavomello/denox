/**
 * EXAMPLE LAYOUT — Neobrutalist.
 *
 * Design idea: loud and unapologetic — thick black borders, hard offset
 * shadows, flat vivid color blocks and oversized uppercase type. The
 * opposite pole from "editorial", proving the same config data can wear
 * radically different skins.
 *
 * Try it: set `layout: "neobrutalist"` in any page config.
 * Adopt it: copy this file out of examples/, rename, register, customize.
 * Styles are fully scoped under `.layout-neobrutalist` — nothing bleeds.
 */

import type { Context } from "hono";
import type { UiConfig } from "@/config/define_config.ts";
import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";

/**
 * Renders the neobrutalist document for the given UI identity.
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
      .layout-neobrutalist { margin: 0; background: #fff8e7; color: #111; font-family: ui-sans-serif, system-ui, sans-serif; }
      .layout-neobrutalist .nb-header { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; padding: 18px 22px; background: #ffd23f; border-bottom: 4px solid #111; }
      .layout-neobrutalist .nb-brand { display: inline-flex; align-items: center; gap: 10px; color: #111; text-decoration: none; font-weight: 900; font-size: 1.35rem; text-transform: uppercase; letter-spacing: 0.03em; background: #fff; border: 3px solid #111; box-shadow: 5px 5px 0 #111; padding: 6px 14px; }
      .layout-neobrutalist .nb-brand img { width: 30px; height: 30px; }
      .layout-neobrutalist nav { display: flex; gap: 12px; flex-wrap: wrap; }
      .layout-neobrutalist nav a { color: #111; text-decoration: none; font-weight: 800; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; background: #ff5d5d; border: 3px solid #111; box-shadow: 4px 4px 0 #111; padding: 7px 12px; transition: transform 0.06s ease, box-shadow 0.06s ease; }
      .layout-neobrutalist nav a:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 #111; }
      .layout-neobrutalist .nb-main { max-width: 880px; margin: 42px auto 70px; padding: 30px 26px; background: #fff; border: 4px solid #111; box-shadow: 10px 10px 0 #111; box-sizing: border-box; }
      .layout-neobrutalist .nb-main h1 { font-size: 2.4rem; text-transform: uppercase; font-weight: 900; margin-top: 0; }
      .layout-neobrutalist .nb-main a { color: #111; background: #7df9aa; border: 2px solid #111; padding: 0 4px; text-decoration: none; }
      .layout-neobrutalist .nb-footer { text-align: center; padding: 20px; font-weight: 800; text-transform: uppercase; font-size: 0.8rem; background: #111; color: #fff; }
      .layout-neobrutalist .nb-footer a { color: #ffd23f; }
      @media (max-width: 720px) { .layout-neobrutalist .nb-main { margin: 26px 14px 50px; box-shadow: 6px 6px 0 #111; } }
    </style>
  </head>
  <body class="layout-neobrutalist">
  <header class="nb-header">
    <a href="${escapeHtml(ui.brand.href)}" class="nb-brand">
      <img src="${escapeHtml(ui.brand.logo)}" alt="${
    escapeHtml(ui.brand.label)
  }" width="30" height="30" />
      <span>${escapeHtml(ui.brand.label)}</span>
    </a>
    <nav>
        ${nav}
    </nav>
  </header>
  <main class="nb-main">
    ${content}
  </main>
  <footer class="nb-footer">
    ${escapeHtml(ui.footer.text)} <a href="${escapeHtml(ui.footer.href)}">${
    escapeHtml(ui.footer.label)
  }</a>
  </footer>
  </body>
</html>
`;
}

/**
 * Neobrutalist layout entry point (registry signature).
 *
 * @param c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export default function neobrutalistLayout(c: Context, content: string): string {
  return render(site.ui, c, content);
}
