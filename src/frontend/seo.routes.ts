/**
 * SEO routes — /sitemap.xml and /robots.txt.
 *
 * The sitemap is derived from the generated file based route table
 * (static routes only; dynamic `:param` routes cannot be enumerated).
 * Both routes honor the project configuration toggles.
 */

import type { Hono } from "hono";
import { pages } from "@/frontend/pages.gen.ts";
import { resolveBaseUrl } from "@/frontend/head.ts";
import { site } from "@/config/site.ts";

const startedAt = new Date().toISOString();

/**
 * Registers SEO endpoints according to the configuration.
 *
 * @param app Frontend router.
 */
export function registerSeoRoutes(app: Hono): void {
  if (!site.seo.enabled) return;

  if (site.seo.sitemap) {
    app.get("/sitemap.xml", (c) => {
      const base = resolveBaseUrl(c);
      const urls = pages
        .filter((page) => !page.route.includes(":"))
        .map((page) =>
          `  <url>\n    <loc>${base}${page.route}</loc>\n    <lastmod>${startedAt}</lastmod>\n  </url>`
        )
        .join("\n");
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
      return c.body(xml, 200, { "content-type": "application/xml; charset=utf-8" });
    });
  }

  if (site.seo.robots) {
    app.get("/robots.txt", (c) => {
      const lines = ["User-agent: *", "Allow: /"];
      if (site.seo.sitemap) {
        lines.push(`Sitemap: ${resolveBaseUrl(c)}/sitemap.xml`);
      }
      return c.text(`${lines.join("\n")}\n`);
    });
  }
}
