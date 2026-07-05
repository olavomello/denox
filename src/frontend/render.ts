// src/frontend/render.ts

import type { Context } from "hono";

import defaultLayout from "./layouts/default.ts";

type PageModule = {
  default: (c: Context) => string | Promise<string>;
  config?: {
    layout?: string;
  };
};

const layouts: Record<
  string,
  (c: Context, html: string) => string | Promise<string>
> = {
  default: defaultLayout,
};

export async function render(
  c: Context,
  page: PageModule,
): Promise<Response> {

  const html = await page.default(c);

  const layoutName = page.config?.layout ?? "default";

  const layout = layouts[layoutName];

  if (!layout) {
    throw new Error(`Layout "${layoutName}" not found.`);
  }

  const document = await layout(c, html);

  return c.html(document);

}