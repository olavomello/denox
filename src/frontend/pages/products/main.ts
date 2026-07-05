/**
 * Products page — `/products`.
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
} as const;

/**
 * Renders the products page body.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default function productsPage(_c: Context): string {
  return `
    <h1>Products</h1>
    <p>Product data is served by the JSON API at <a href="/api/products">/api/products</a>.</p>
  `;
}
