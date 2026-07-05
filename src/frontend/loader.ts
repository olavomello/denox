/**
 * Route loader.
 *
 * Registers every generated page route on the frontend router. Kept
 * separate from `main.ts` so it can be tested in isolation.
 */

import type { Hono } from "hono";
import { pages } from "@/frontend/pages.gen.ts";
import { render } from "@/frontend/render.ts";

/**
 * Registers all file based page routes.
 *
 * @param app Frontend router.
 */
export function loadPages(app: Hono): void {
  for (const page of pages) {
    app.get(page.route, (c) => render(c, page.module));
  }
}
