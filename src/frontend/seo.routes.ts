/**
 * SEO routes — /sitemap.xml and /robots.txt.
 *
 * The sitemap combines the generated file based route table (static
 * routes) with dynamic entries contributed by registered providers —
 * feature slices enumerate their own pages (e.g. product slug URLs) via
 * {@link registerSitemapProvider}. Both routes honor the configuration
 * toggles.
 */

import type { Hono } from "hono";
import { pages } from "@/frontend/pages.gen.ts";
import { resolveBaseUrl } from "@/frontend/head.ts";
import { site } from "@/config/site.ts";

const startedAt = new Date().toISOString();

/** A sitemap URL entry contributed by a provider. */
export interface SitemapEntry {
  /** Absolute path (e.g. "/products/denox-t-shirt"). */
  readonly path: string;
  /** Optional last-modified ISO timestamp. */
  readonly lastmod?: string;
}

/** Async producers of dynamic sitemap entries. */
type SitemapProvider = () => Promise<readonly SitemapEntry[]>;

const providers: SitemapProvider[] = [];

/**
 * Registers a dynamic sitemap provider. Called by feature composition
 * roots at boot; the sitemap handler awaits every provider per request, so
 * entries always reflect current data (products created after boot appear
 * without a restart).
 *
 * @param provider Function returning the entries to include.
 */
export function registerSitemapProvider(provider: SitemapProvider): void {
  providers.push(provider);
}

/**
 * Registers SEO endpoints according to the configuration.
 *
 * @param app Frontend router.
 */
export function registerSeoRoutes(app: Hono): void {
  if (!site.seo.enabled) return;

  if (site.seo.sitemap) {
    app.get("/sitemap.xml", async (c) => {
      const base = resolveBaseUrl(c);
      const staticEntries: SitemapEntry[] = pages
        .filter((page) => !page.route.includes(":"))
        .map((page) => ({ path: page.route, lastmod: startedAt }));
      const dynamicEntries = (await Promise.all(providers.map((provide) => provide()))).flat();
      const urls = [...staticEntries, ...dynamicEntries]
        .map((entry) =>
          `  <url>\n    <loc>${base}${entry.path}</loc>\n    <lastmod>${
            entry.lastmod ?? startedAt
          }</lastmod>\n  </url>`
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
