/**
 * PWA routes — /site.webmanifest.
 *
 * The web app manifest is generated from the project configuration
 * (single source of truth) instead of a hand-maintained static file, so
 * name, colors and icons never drift from the rest of the metadata.
 */

import type { Hono } from "hono";
import { site } from "@/config/site.ts";

/**
 * Registers the PWA manifest endpoint when enabled.
 *
 * @param app Frontend router.
 */
export function registerPwaRoutes(app: Hono): void {
  if (!site.pwa.enabled) return;

  app.get("/site.webmanifest", (c) => {
    const manifest = {
      name: site.app.name,
      short_name: site.app.shortName,
      description: site.app.description,
      start_url: "/",
      scope: "/",
      display: site.pwa.display,
      background_color: site.app.backgroundColor,
      theme_color: site.app.themeColor,
      lang: site.app.locale,
      icons: site.pwa.icons,
    };
    return c.body(JSON.stringify(manifest, null, 2), 200, {
      "content-type": "application/manifest+json; charset=utf-8",
    });
  });
}
