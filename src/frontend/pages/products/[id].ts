/**
 * Product view — `/products/:id`.
 *
 * Server-rendered single-product page (dynamic file based route). The
 * per-request `meta` resolver fetches the product — powering dynamic SEO
 * (title, description, OG image) — throws the standard 404 when it does not
 * exist, and stashes the entity in the context so the body renders without
 * a second lookup.
 */

import type { Context } from "hono";
import type { Product } from "@/api/products/product.model.ts";
import { productService } from "@/api/products/product.routes.ts";
import { escapeHtml } from "@/shared/html.ts";
import type { PageMeta } from "@/frontend/head.ts";

/** Page configuration with a per-request metadata resolver. */
export const config = {
  layout: "product",
  meta: async (c: Context): Promise<PageMeta> => {
    const product = await productService.getById(c.req.param("id") ?? "");
    c.set("product", product);
    return {
      title: product.name,
      description: product.description ?? `${product.name} — available on DenoX.`,
      ...(product.imageUrl !== undefined ? { image: product.imageUrl } : {}),
    };
  },
} as const;

/** Formats a price for display. */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

/**
 * Renders the product view body.
 *
 * @param c Request context (product resolved by the meta step).
 * @returns Page HTML.
 */
export default function productPage(c: Context): string {
  const product = c.get("product") as Product;
  const name = escapeHtml(product.name);
  const media = product.imageUrl !== undefined
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="${name}">`
    : `<span class="product-card-initial" aria-hidden="true">${
      escapeHtml(product.name.charAt(0).toUpperCase())
    }</span>`;

  return `
    <article class="product-view">
      <div class="product-view-media">${media}</div>
      <div class="product-view-details">
        <h1>${name}</h1>
        <p class="product-price product-price-large">${formatPrice(product.price)}</p>
        ${
    product.description !== undefined
      ? `<p class="product-view-description">${escapeHtml(product.description)}</p>`
      : ""
  }
        <p class="product-view-meta">Added on ${
    escapeHtml(new Date(product.createdAt).toISOString().slice(0, 10))
  }</p>
      </div>
    </article>
  `;
}
