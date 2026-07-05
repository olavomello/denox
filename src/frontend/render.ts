/**
 * Page rendering pipeline.
 *
 * Executes the page module, resolves its layout from the registry and
 * returns the final HTML response. Unknown layouts fail loudly at request
 * time with a clear message (and are caught by the e2e/integration tests).
 */

import type { Context } from "hono";
import { layouts } from "@/frontend/layouts/registry.ts";

/** Contract every page module must follow. */
export interface PageModule {
  /** Renders the page body HTML (dynamic values already escaped). */
  readonly default: (c: Context) => string | Promise<string>;
  /** Optional page configuration. */
  readonly config?: {
    readonly layout?: string;
  };
}

/**
 * Renders a page module inside its layout.
 *
 * @param c Request context.
 * @param page Page module to render.
 * @returns HTML response.
 */
export async function render(c: Context, page: PageModule): Promise<Response> {
  const html = await page.default(c);
  const layoutName = page.config?.layout ?? "default";
  const layout = layouts[layoutName];

  if (layout === undefined) {
    throw new Error(
      `Layout "${layoutName}" not found. Register it in src/frontend/layouts/registry.ts`,
    );
  }

  const document = await layout(c, html);
  return c.html(document);
}
