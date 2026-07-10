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
import { NotFoundException } from "@/shared/exceptions/app_exception.ts";
import type { PageMeta } from "@/frontend/head.ts";

/** Page configuration with a per-request metadata resolver. */
export const config = {
  layout: "product",
  meta: async (c: Context): Promise<PageMeta> => {
    const stashed = c.get("product") as Product | undefined;
    const product = stashed ??
      await (async () => {
        const found = await productService.findBySlug(c.req.param("slug") ?? "");
        if (found === null) {
          throw new NotFoundException(`Product "${c.req.param("slug")}" not found`);
        }
        return found;
      })();
    c.set("product", product);
    return {
      title: product.name,
      description: product.description ?? `${product.name} — available on DenoX.`,
      ...(product.images[0] !== undefined ? { image: product.images[0] } : {}),
    };
  },
} as const;

/** Formats a price for display. */
function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

/** Renders the media column: carousel (2+ images), single image or placeholder. */
function productMedia(product: Product, name: string): string {
  if (product.images.length === 0) {
    return `<div class="product-view-media"><span class="product-card-initial" aria-hidden="true">${
      escapeHtml(product.name.charAt(0).toUpperCase())
    }</span></div>`;
  }
  if (product.images.length === 1) {
    return `<div class="product-view-media"><img src="${
      escapeHtml(product.images[0] ?? "")
    }" alt="${name}"></div>`;
  }
  const slides = product.images
    .map((image, i) =>
      `<img src="${escapeHtml(image)}" alt="${name} — photo ${i + 1}"${
        i === 0 ? ' loading="eager"' : ' loading="lazy"'
      }>`
    )
    .join("");
  return `<div class="product-carousel" data-carousel>
    <button type="button" class="carousel-btn carousel-prev" data-carousel-prev aria-label="Previous image">‹</button>
    <div class="carousel-track" data-carousel-track tabindex="0" aria-label="${name} images">${slides}</div>
    <button type="button" class="carousel-btn carousel-next" data-carousel-next aria-label="Next image">›</button>
    <span class="carousel-counter" data-carousel-counter aria-live="polite"></span>
  </div>`;
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

  return `
    <article class="product-view">
      ${productMedia(product, name)}
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
