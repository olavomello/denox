/**
 * Responsive image tag helper.
 *
 * Emits `<img>` with srcset (configured variant widths), CLS-preventing
 * dimensions, native lazy loading (eager for the LCP image) and derived
 * alt text — the single place pages build product image markup.
 */

import type { ProductImage } from "@/api/products/product.model.ts";
import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";

/** Options for {@link imageTag}. */
export interface ImageTagOptions {
  /** Fallback alt when the image carries none (e.g. the product name). */
  readonly fallbackAlt: string;
  /** `sizes` attribute (layout-dependent). */
  readonly sizes?: string;
  /** Loads eagerly (above-the-fold/LCP images). Default: lazy. */
  readonly eager?: boolean;
}

/**
 * Renders a responsive, CLS-safe `<img>` for an uploaded image.
 *
 * @param image Image metadata.
 * @param options Alt/sizes/loading policy.
 * @returns Escaped HTML tag.
 */
export function imageTag(image: ProductImage, options: ImageTagOptions): string {
  const url = escapeHtml(image.url);
  const alt = escapeHtml(image.alt !== "" ? image.alt : options.fallbackAlt);
  const widths = site.media.widths;
  const srcset = widths.map((w) => `${url}?w=${w} ${w}w`).join(", ");
  const sizes = options.sizes !== undefined ? ` sizes="${escapeHtml(options.sizes)}"` : "";
  const dimensions = image.width > 0 && image.height > 0
    ? ` width="${image.width}" height="${image.height}"`
    : "";
  const loading = options.eager === true
    ? ' loading="eager" fetchpriority="high"'
    : ' loading="lazy" decoding="async"';
  return `<img src="${url}" srcset="${srcset}"${sizes}${dimensions} alt="${alt}"${loading}>`;
}
