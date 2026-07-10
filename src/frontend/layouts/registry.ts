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
import editorialLayout from "@/frontend/layouts/examples/editorial.ts";
import midnightLayout from "@/frontend/layouts/examples/midnight.ts";
import neobrutalistLayout from "@/frontend/layouts/examples/neobrutalist.ts";
import productLayout from "@/frontend/layouts/product.ts";
import showcaseLayout from "@/frontend/layouts/showcase.ts";

/** Signature every layout must implement. */
export type Layout = (c: Context, content: string) => string | Promise<string>;

/** Every available layout, keyed by name. */
export const layouts: Readonly<Record<string, Layout>> = {
  default: defaultLayout,
  showcase: showcaseLayout,
  product: productLayout,
  // Example layouts (layouts/examples/): registered so any page can try
  // one with `layout: "<name>"`. Copy a file out of examples/ to adopt it
  // as your base design.
  midnight: midnightLayout,
  editorial: editorialLayout,
  neobrutalist: neobrutalistLayout,
};
