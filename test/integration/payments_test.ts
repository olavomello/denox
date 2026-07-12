/**
 * Integration tests — payments feature.
 *
 * The wired app runs with payments.provider "none" (FR-1); the lifecycle
 * suite composes the real slice (controller, service, repositories,
 * middleware) around a MockProvider, and the StripeProvider suite points
 * STRIPE_API_BASE at a local mock server.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { app } from "@/app.ts";
import { PaymentController } from "@/api/payments/payment.controller.ts";
import {
  InMemoryEventLedger,
  InMemoryPaymentRepository,
} from "@/api/payments/payment.repository.ts";
import { PaymentService } from "@/api/payments/payment.service.ts";
import { MockProvider, StripeProvider } from "@/api/payments/provider.ts";
import { productService } from "@/api/products/product.routes.ts";
import { errorHandler } from "@/middleware/error_handler.ts";
import { requireAuth, requireRole } from "@/middleware/auth.ts";
import { adminCookie, userCookie } from "../helpers/auth.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");
const ADMIN = await adminCookie();
const { cookie: USER, userId: USER_ID } = await userCookie();
const { cookie: OTHER } = await userCookie();

/** Composes the payments slice around a MockProvider. */
function paymentsApp(): { api: Hono; repository: InMemoryPaymentRepository } {
  const repository = new InMemoryPaymentRepository();
  const service = new PaymentService(
    repository,
    new InMemoryEventLedger(),
    new MockProvider(),
    productService,
  );
  const controller = new PaymentController(service, new MockProvider());
  const api = new Hono().basePath("/api");
  api.onError(errorHandler);
  api.post("/payments/checkout", requireAuth(), controller.checkout);
  api.post("/payments/webhook", controller.webhook);
  api.get("/payments/:id", requireAuth(), controller.show);
  api.get("/payments", requireRole("admin"), controller.index);
  return { api, repository };
}

/** Creates a product through the shared service (admin path not needed). */
async function createProduct(price: number): Promise<{ id: string; name: string }> {
  const created = await app.request("http://localhost/api/products", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ name: "Payable", price }),
  });
  return (await created.json()).data;
}

Deno.test("FR-1: wired app with provider none answers 501 without keys", async () => {
  const res = await app.request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ADMIN },
    body: JSON.stringify({ amountCents: 100 }),
  });
  assertEquals(res.status, 501);
  assertEquals((await res.json()).error.code, "NOT_IMPLEMENTED");
});

Deno.test("checkout: anonymous 401; product mode uses stored price and snapshots", async () => {
  const { api, repository } = paymentsApp();
  const product = await createProduct(19.9);

  const anonymous = await api.request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: product.id }),
  });
  assertEquals(anonymous.status, 401);
  await anonymous.body?.cancel();

  // Client tries to tamper the price — amounts are ignored in product mode.
  const res = await api.request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: USER },
    body: JSON.stringify({ productId: product.id, amountCents: 1 }),
  });
  assertEquals(res.status, 400); // exclusive fields (spec: exactly one mode)
  await res.body?.cancel();

  const clean = await api.request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: USER },
    body: JSON.stringify({ productId: product.id }),
  });
  assertEquals(clean.status, 201);
  const body = await clean.json();
  assertEquals(body.data.status, "pending");
  assertStringIncludes(body.data.url, "https://checkout.mock.local/");

  const stored = await repository.findById(body.data.paymentId);
  assertEquals(stored?.amountCents, 1990); // server-side price
  assertEquals(stored?.userId, USER_ID);
  assertEquals(stored?.productSnapshot, { id: product.id, name: "Payable", price: 19.9 });
});

Deno.test("webhook lifecycle: paid with paidAt; invalid signature changes nothing; replay idempotent", async () => {
  const { api, repository } = paymentsApp();
  const product = await createProduct(5);
  const checkout = await api.request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: USER },
    body: JSON.stringify({ productId: product.id }),
  });
  const { paymentId } = (await checkout.json()).data;
  const payment = await repository.findById(paymentId);
  const event = JSON.stringify({
    id: "evt_pay_1",
    type: "checkout.session.completed",
    providerId: payment?.providerId,
  });

  const bad = await api.request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "x-webhook-signature": "wrong" },
    body: event,
  });
  assertEquals(bad.status, 400);
  await bad.body?.cancel();
  assertEquals((await repository.findById(paymentId))?.status, "pending");

  const good = await api.request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "x-webhook-signature": "mock-valid" },
    body: event,
  });
  assertEquals(good.status, 200);
  await good.body?.cancel();
  const paid = await repository.findById(paymentId);
  assertEquals(paid?.status, "paid");
  assertEquals(typeof paid?.paidAt, "string");
  const paidAt = paid?.paidAt;

  // Replay: 200, no state change (paidAt untouched).
  const replay = await api.request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "x-webhook-signature": "mock-valid" },
    body: event,
  });
  assertEquals(replay.status, 200);
  await replay.body?.cancel();
  assertEquals((await repository.findById(paymentId))?.paidAt, paidAt);

  // Unknown provider id: 200, nothing leaks.
  const unknown = await api.request("http://localhost/api/payments/webhook", {
    method: "POST",
    headers: { "x-webhook-signature": "mock-valid" },
    body: JSON.stringify({ id: "evt_x", type: "checkout.session.completed", providerId: "ghost" }),
  });
  assertEquals(unknown.status, 200);
  await unknown.body?.cancel();
});

Deno.test("authorization matrix: owner 200, admin 200, other 403, anonymous 401", async () => {
  const { api } = paymentsApp();
  const product = await createProduct(2);
  const checkout = await api.request("http://localhost/api/payments/checkout", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: USER },
    body: JSON.stringify({ productId: product.id }),
  });
  const { paymentId } = (await checkout.json()).data;
  const url = `http://localhost/api/payments/${paymentId}`;

  assertEquals((await api.request(url, { headers: { cookie: USER } })).status, 200);
  assertEquals((await api.request(url, { headers: { cookie: ADMIN } })).status, 200);
  assertEquals((await api.request(url, { headers: { cookie: OTHER } })).status, 403);
  assertEquals((await api.request(url)).status, 401);

  // Admin listing; regular user forbidden.
  assertEquals(
    (await api.request("http://localhost/api/payments", { headers: { cookie: ADMIN } })).status,
    200,
  );
  assertEquals(
    (await api.request("http://localhost/api/payments", { headers: { cookie: USER } })).status,
    403,
  );
});

Deno.test("StripeProvider posts form-encoded sessions to STRIPE_API_BASE", async () => {
  let captured = "";
  const server = Deno.serve({ port: 0, onListen: () => {} }, async (req) => {
    captured = await req.text();
    return Response.json({
      id: "cs_local_1",
      url: "https://checkout.stripe.com/pay/cs_local_1",
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    });
  });
  const { port } = server.addr as Deno.NetAddr;
  const provider = new StripeProvider({
    secretKey: "sk_test_x",
    webhookSecret: "whsec_x",
    apiBase: `http://127.0.0.1:${port}`,
  });
  const session = await provider.createCheckout({
    userId: "u1",
    amountCents: 1990,
    currency: "usd",
    paymentId: "pay_1",
    productName: "Payable & Co",
  });
  assertEquals(session.providerId, "cs_local_1");
  assertStringIncludes(captured, "mode=payment");
  assertStringIncludes(
    captured,
    encodeURIComponent("line_items[0][price_data][unit_amount]") + "=1990",
  );
  assertStringIncludes(captured, encodeURIComponent("metadata[payment_id]") + "=pay_1");
  assertStringIncludes(captured, "payment%3Dpay_1"); // success_url carries ?payment=
  await server.shutdown();
});
