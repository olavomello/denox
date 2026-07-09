/**
 * Shared layout partials.
 *
 * Renders the site header (brand + navigation) and footer from the `ui`
 * section of denox.config.ts — data in, escaped markup out. Layouts compose
 * these partials so the site identity is edited in one place (the config);
 * a fully custom layout simply skips them.
 */

import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";

/**
 * Renders the shared site header (brand + nav) from configuration.
 *
 * @returns Header HTML.
 */
export function siteHeader(): string {
  const { brand, nav } = site.ui;
  const links = nav
    .map((item) => `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`)
    .join("\n        ");
  return `<header>
    <div class="container navbar">
      <a href="${escapeHtml(brand.href)}" class="brand">
        <div class="logo"><img src="${escapeHtml(brand.logo)}" alt="${
    escapeHtml(brand.label)
  }" width="40" height="40" /></div>
        <span>${escapeHtml(brand.label)}</span>
      </a>
      <nav>
        ${links}
      </nav>
    </div>
  </header>`;
}

/**
 * Renders the shared site footer from configuration.
 *
 * @returns Footer HTML.
 */
export function siteFooter(): string {
  const { footer } = site.ui;
  return `<footer>
    ${escapeHtml(footer.text)} <strong><a href="${escapeHtml(footer.href)}">${
    escapeHtml(footer.label)
  }</a></strong>
  </footer>`;
}
