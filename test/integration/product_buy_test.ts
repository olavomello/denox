/**
 * Integration tests — product buy flow (zero-JS PRG).
 * Lifecycle runs on a composed app with a MockProvider service; FR-1
 * (disabled deployments stay inert) runs on the wired app, whose repo
 * config keeps payments.provider "none".
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { app } from "@/app.ts";
import {
  InMemoryEventLedger,
  InMemoryPaymentRepository,
} from "@/api/payments/payment.repository.ts";
import { PaymentService } from "@/api/payments/payment.service.ts";
import { MockProvider } from "@/api/payments/provider.ts";
import { productService } from "@/api/products/product.routes.ts";
import { registerBuyRoutes } from "@/frontend/buy.routes.ts";
import { buyButtonHtml } from "@/frontend/pages/products/[slug].ts";
import { errorHandler } from "@/middleware/error_handler.ts";
import { site } from "@/config/site.ts";
import { adminCookie, userCookie } from "../helpers/auth.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");
const ADMIN = await adminCookie();

/** Composed web app with an enabled payments service. */
function buyApp(): { web: Hono; repository: InMemoryPaymentRepository } {
  const repository = new InMemoryPaymentRepository();
  const service = new PaymentService(
    repository,
    new InMemoryEventLedger(),
    new MockProvider(),
    productService,
  );
  const web = new Hono();
  web.onError(errorHandler);
  registerBuyRoutes(web, service);
  return { web, repository };
}

/** Creates a product; returns {id, slug}. */
async function createProduct(): Promise<{ id: string; slug: string }> {
  const res = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ name: "Buyable Tee", price: 49.9 }),
  });
  return (await res.json()).data;
}

Deno.test("buyButtonHtml renders only when a provider is enabled", () => {
  const product = { slug: "buyable-tee", price: 49.9 };
  assertEquals(buyButtonHtml(product, "none"), "");
  const html = buyButtonHtml(product, "stripe");
  assertStringIncludes(html, 'action="/products/buyable-tee/buy"');
  assertStringIncludes(html, "Buy now — $49.90");
});

Deno.test("FR-1/FR-2: the wired app matches its configured provider", async () => {
  const { slug } = await createProduct();
  const page = await app.request(`http://localhost/products/${slug}`);
  const html = await page.text();

  if (site.payments.provider === "none") {
    // Disabled deployments: no form, no route.
    assertEquals(html.includes("product-buy-button"), false);
    const post = await app.request(`http://localhost/products/${slug}/buy`, {
      method: "POST",
    });
    assertEquals(post.status, 404);
    await post.body?.cancel();
  } else {
    // Enabled deployments: the form renders with the PRG action.
    assertStringIncludes(html, `action="/products/${slug}/buy"`);
    assertStringIncludes(html, "Buy now");
  }
});

Deno.test("anonymous buyers are redirected to /login (no payment created)", async () => {
  const { web, repository } = buyApp();
  const { slug } = await createProduct();
  const res = await web.request(`http://localhost/products/${slug}/buy`, { method: "POST" });
  assertEquals(res.status, 303);
  assertEquals(res.headers.get("location"), "/login");
  assertEquals((await repository.findAll()).length, 0);
});

Deno.test("authenticated buy: pending payment with snapshot, 303 to checkout", async () => {
  const { web, repository } = buyApp();
  const { id, slug } = await createProduct();
  const { cookie, userId } = await userCookie();

  const res = await web.request(`http://localhost/products/${slug}/buy`, {
    method: "POST",
    headers: { cookie },
  });
  assertEquals(res.status, 303);
  assertStringIncludes(res.headers.get("location") ?? "", "https://checkout.mock.local/");

  const payments = await repository.findAll();
  assertEquals(payments.length, 1);
  assertEquals(payments[0]?.status, "pending");
  assertEquals(payments[0]?.userId, userId);
  assertEquals(payments[0]?.amountCents, 4990);
  assertEquals(payments[0]?.productSnapshot?.id, id);
});

Deno.test("unknown slug returns 404", async () => {
  const { web } = buyApp();
  const { cookie } = await userCookie();
  const res = await web.request("http://localhost/products/ghost-product/buy", {
    method: "POST",
    headers: { cookie },
  });
  assertEquals(res.status, 404);
  await res.body?.cancel();
});
