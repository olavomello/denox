/**
 * Frontend router. Serves the file based pages under `/`.
 */

import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { loadPages } from "@/frontend/loader.ts";
import { registerMediaRoutes } from "@/frontend/media.routes.ts";
import { productService } from "@/api/products/product.routes.ts";
import { registerSitemapProvider } from "@/frontend/seo.routes.ts";
import { contactService } from "@/api/contact/contact.routes.ts";
import { parseCreateContactDto } from "@/api/contact/contact.dto.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";
import { registerPwaRoutes } from "@/frontend/pwa.routes.ts";
import { registerSeoRoutes } from "@/frontend/seo.routes.ts";

const web = new Hono();

// CSRF protection for browser-submitted forms (origin check).
web.use("*", csrf());

// Public media (uploads served under the public namespace).
registerMediaRoutes(web);

// Friendly product URLs: resolve slugs, 301 legacy UUID and stale-slug
// requests to the canonical address, and stash the entity for the page.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
web.use("/products/:slug", async (c, next) => {
  const requested = c.req.param("slug") ?? "";
  if (UUID_PATTERN.test(requested)) {
    const byId = await productService.list().then((all) =>
      all.find((p) => p.id === requested) ?? null
    );
    if (byId !== null) {
      return c.redirect(`/products/${byId.slug}`, 301);
    }
    return await next();
  }
  const product = await productService.findBySlug(requested);
  if (product !== null && product.slug !== requested) {
    return c.redirect(`/products/${product.slug}`, 301);
  }
  if (product !== null) {
    // The page reads this via c.get("product"); the router's default Env
    // has no typed Variables, hence the contained cast.
    (c as unknown as { set(key: string, value: unknown): void }).set("product", product);
  }
  await next();
});

// Dynamic sitemap entries: every product page (slug URLs).
registerSitemapProvider(async () =>
  (await productService.list()).map((product) => ({
    path: `/products/${product.slug}`,
    lastmod: product.createdAt,
  }))
);

// Production-ready endpoints (config-driven): sitemap, robots, manifest.
registerSeoRoutes(web);
registerPwaRoutes(web);

// No-JS fallback for the contact form (Post-Redirect-Get). The enhanced
// path submits JSON to /api/contact; this route serves browsers without JS
// through the same DTO and service.
web.post("/contact", async (c) => {
  const body = await c.req.parseBody();
  try {
    const dto = parseCreateContactDto(body);
    await contactService.submit(dto);
    return c.redirect("/contact?sent=1", 303);
  } catch (error) {
    if (error instanceof ValidationException) {
      return c.redirect("/contact?error=1", 303);
    }
    throw error;
  }
});

loadPages(web);

export default web;
