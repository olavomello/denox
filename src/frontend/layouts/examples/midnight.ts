/**
 * EXAMPLE LAYOUT — Midnight (dark dashboard).
 *
 * Design idea: app-like density on a near-black canvas — fixed sidebar
 * navigation, neon accent, hairline panel borders. Shows how a layout can
 * completely restructure the shell (sidebar instead of top bar) while the
 * site identity (brand, nav, footer) still flows from denox.config.ts.
 *
 * Try it: set `layout: "midnight"` in any page config.
 * Adopt it: copy this file out of examples/, rename, register, customize.
 * Styles are fully scoped under `.layout-midnight` — nothing bleeds.
 */

import type { Context } from "hono";
import type { UiConfig } from "@/config/define_config.ts";
import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";

/**
 * Renders the midnight document for the given UI identity.
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
      .layout-midnight { margin: 0; background: #0b0e14; color: #cfd8e3; font-family: ui-sans-serif, system-ui, sans-serif; display: grid; grid-template-columns: 230px 1fr; min-height: 100vh; }
      .layout-midnight .mn-sidebar { background: #10141d; border-right: 1px solid #1d2432; display: flex; flex-direction: column; padding: 22px 18px; position: sticky; top: 0; height: 100vh; box-sizing: border-box; }
      .layout-midnight .mn-brand { display: flex; align-items: center; gap: 10px; color: #e8eef7; text-decoration: none; font-weight: 700; letter-spacing: 0.02em; }
      .layout-midnight .mn-brand img { width: 30px; height: 30px; filter: drop-shadow(0 0 6px rgba(34, 211, 238, 0.55)); }
      .layout-midnight nav { display: flex; flex-direction: column; gap: 4px; margin-top: 28px; }
      .layout-midnight nav a { color: #8a97ab; text-decoration: none; padding: 9px 12px; border-radius: 8px; border-left: 2px solid transparent; font-size: 0.92rem; }
      .layout-midnight nav a:hover { color: #22d3ee; background: rgba(34, 211, 238, 0.08); border-left-color: #22d3ee; }
      .layout-midnight .mn-main { padding: 34px 42px; max-width: 1000px; box-sizing: border-box; }
      .layout-midnight .mn-main h1, .layout-midnight .mn-main h2 { color: #f1f6fc; }
      .layout-midnight .mn-main a { color: #22d3ee; }
      .layout-midnight .mn-footer { margin-top: auto; padding-top: 18px; border-top: 1px solid #1d2432; font-size: 0.78rem; color: #5c6879; }
      .layout-midnight .mn-footer a { color: #22d3ee; text-decoration: none; }
      @media (max-width: 720px) { .layout-midnight { grid-template-columns: 1fr; } .layout-midnight .mn-sidebar { position: static; height: auto; flex-direction: row; align-items: center; gap: 16px; flex-wrap: wrap; } .layout-midnight nav { flex-direction: row; margin-top: 0; flex-wrap: wrap; } .layout-midnight .mn-footer { display: none; } }
    </style>
  </head>
  <body class="layout-midnight">
  <aside class="mn-sidebar">
    <a href="${escapeHtml(ui.brand.href)}" class="mn-brand">
      <img src="${escapeHtml(ui.brand.logo)}" alt="${
    escapeHtml(ui.brand.label)
  }" width="30" height="30" />
      <span>${escapeHtml(ui.brand.label)}</span>
    </a>
    <nav>
        ${nav}
    </nav>
    <div class="mn-footer">
      ${escapeHtml(ui.footer.text)} <a href="${escapeHtml(ui.footer.href)}">${
    escapeHtml(ui.footer.label)
  }</a>
    </div>
  </aside>
  <main class="mn-main">
    ${content}
  </main>
  </body>
</html>
`;
}

/**
 * Midnight layout entry point (registry signature).
 *
 * @param c Request context.
 * @param content Rendered page HTML.
 * @returns Complete HTML document.
 */
export default function midnightLayout(c: Context, content: string): string {
  return render(site.ui, c, content);
}
