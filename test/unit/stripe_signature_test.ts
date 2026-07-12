/**
 * Unit tests — Stripe webhook signature verification (Web Crypto).
 */

import { assertEquals, assertRejects } from "@std/assert";
import { StripeProvider } from "@/api/payments/provider.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";

const SECRET = "whsec_test_secret";
const encoder = new TextEncoder();

/** Signs a body the way Stripe does. */
async function sign(body: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  const hex = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

const NOW = 1_760_000_000_000;
const provider = new StripeProvider({
  secretKey: "sk_test",
  webhookSecret: SECRET,
  now: () => NOW,
});

const body = JSON.stringify({
  id: "evt_1",
  type: "checkout.session.completed",
  created: Math.floor(NOW / 1000),
  data: { object: { id: "cs_test_1" } },
});

Deno.test("valid signature parses and normalizes the event", async () => {
  const event = await provider.parseWebhook(body, await sign(body, Math.floor(NOW / 1000)));
  assertEquals(event.id, "evt_1");
  assertEquals(event.providerId, "cs_test_1");
  assertEquals(event.type, "checkout.session.completed");
});

Deno.test("tampered payloads and malformed headers are rejected", async () => {
  const signature = await sign(body, Math.floor(NOW / 1000));
  await assertRejects(
    () => provider.parseWebhook(body.replace("cs_test_1", "cs_evil"), signature),
    BadRequestException,
  );
  await assertRejects(() => provider.parseWebhook(body, "garbage"), BadRequestException);
});

Deno.test("stale timestamps are rejected (replay tolerance)", async () => {
  const stale = Math.floor(NOW / 1000) - 6 * 60; // 6 minutes old
  const staleSignature = await sign(body, stale);
  await assertRejects(
    () => provider.parseWebhook(body, staleSignature),
    BadRequestException,
  );
});
