/**
 * Layout registry.
 *
 * Maps layout names (referenced by pages via `config.layout`) to layout
 * functions. Adding a layout is two steps: create the file in
 * `layouts/` and register it here with one line. The registry is explicit
 * (instead of dynamic imports) so `deno compile` and type checking see
 * every layout statically.
 */

import type { Context } from "hono";
import defaultLayout from "@/frontend/layouts/default.ts";
import productLayout from "@/frontend/layouts/product.ts";
import showcaseLayout from "@/frontend/layouts/showcase.ts";

/** Signature every layout must implement. */
export type Layout = (c: Context, content: string) => string | Promise<string>;

/** Every available layout, keyed by name. */
export const layouts: Readonly<Record<string, Layout>> = {
  default: defaultLayout,
  showcase: showcaseLayout,
  product: productLayout,
};
