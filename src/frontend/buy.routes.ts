/**
 * Product buy flow — zero-JS PRG: the product page posts here, the
 * browser is redirected to the provider-hosted checkout. Registered only
 * when payments are enabled; anonymous buyers are sent to /login.
 */

import type { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { authService } from "@/api/auth/auth.singletons.ts";
import type { PaymentService } from "@/api/payments/payment.service.ts";
import { productService } from "@/api/products/product.routes.ts";
import { SESSION_COOKIE } from "@/middleware/auth.ts";
import { NotFoundException } from "@/shared/exceptions/app_exception.ts";

/**
 * Registers `POST /products/:slug/buy` (no-op when the service is null —
 * disabled deployments keep a 404 there, FR-1).
 *
 * @param app Frontend router.
 * @param service Payments service, or null when payments are disabled.
 */
export function registerBuyRoutes(app: Hono, service: PaymentService | null): void {
  if (service === null) return;

  app.post("/products/:slug/buy", async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE) ?? "";
    const user = sessionId === "" ? null : await authService.resolve(sessionId);
    if (user === null) {
      return c.redirect("/login", 303);
    }
    const product = await productService.findBySlug(c.req.param("slug") ?? "");
    if (product === null) {
      throw new NotFoundException("Product not found");
    }
    const { url } = await service.checkout(user.id, {
      kind: "product",
      productId: product.id,
    });
    return c.redirect(url, 303);
  });
}
