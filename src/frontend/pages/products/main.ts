/**
 * Products showcase — `/products`.
 *
 * Server-rendered storefront grid backed by the products API service (same
 * data source as `GET /api/products`, database-connected via the configured
 * storage driver). Uses the `showcase` layout; every dynamic value is
 * escaped before interpolation.
 */

import type { Context } from "hono";
import type { Product } from "@/api/products/product.model.ts";
import { productService } from "@/api/products/product.routes.ts";
import { escapeHtml } from "@/shared/html.ts";

/** Page configuration. */
export const config = {
  layout: "showcase",
  meta: {
    title: "Products",
    description: "Browse the DenoX product showcase — server rendered, straight from the API.",
  },
} as const;

/** Formats a price for display. */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

/** Renders one product card. */
function productCard(product: Product): string {
  const name = escapeHtml(product.name);
  const description = product.description !== undefined
    ? `<p class="product-card-description">${escapeHtml(product.description)}</p>`
    : "";
  const media = product.imageUrl !== undefined
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${name}" loading="lazy">`
    : `<span class="product-card-initial" aria-hidden="true">${
      escapeHtml(product.name.charAt(0).toUpperCase())
    }</span>`;
  return `
    <a class="product-card" href="/products/${escapeHtml(product.id)}">
      <div class="product-card-media">${media}</div>
      <div class="product-card-body">
        <h2>${name}</h2>
        ${description}
        <span class="product-price">${formatPrice(product.price)}</span>
      </div>
    </a>`;
}

/**
 * Renders the showcase grid.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default async function productsPage(_c: Context): Promise<string> {
  const products = await productService.list();

  if (products.length === 0) {
    return `
      <h1>Products</h1>
      <p class="empty-state">No products yet. Create one through
      <a href="/api/products">the API</a> or run <code>deno task seed</code>.</p>
    `;
  }

  return `
    <h1>Products</h1>
    <div class="product-grid">
      ${products.map(productCard).join("\n")}
    </div>
  `;
}
