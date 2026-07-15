/**
 * Unit tests — lifecycle rules: legal transitions, refund status
 * resolution, event mapping and the refund DTO.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { canTransition } from "@/api/payments/payment.model.ts";
import { parseRefundDto } from "@/api/payments/payment.dto.ts";
import { mapEventStatus, refundStatus } from "@/api/payments/payment.service.ts";
import { withTransition } from "@/api/payments/payment.repository.ts";
import type { Payment } from "@/api/payments/payment.model.ts";

Deno.test("canTransition encodes the state machine (FR-6)", () => {
  // Legal paths.
  assertEquals(canTransition("pending", "paid"), true);
  assertEquals(canTransition("pending", "processing"), true);
  assertEquals(canTransition("processing", "paid"), true);
  assertEquals(canTransition("paid", "refunded"), true);
  assertEquals(canTransition("paid", "partially_refunded"), true);
  assertEquals(canTransition("partially_refunded", "refunded"), true);

  // Illegal: a forged or out-of-order event cannot corrupt a record.
  assertEquals(canTransition("pending", "refunded"), false);
  assertEquals(canTransition("paid", "pending"), false);
  assertEquals(canTransition("refunded", "paid"), false);
  assertEquals(canTransition("expired", "paid"), false);
  assertEquals(canTransition("failed", "refunded"), false);
});

Deno.test("refundStatus distinguishes partial from full", () => {
  assertEquals(refundStatus(1000, 400), "partially_refunded");
  assertEquals(refundStatus(1000, 999), "partially_refunded");
  assertEquals(refundStatus(1000, 1000), "refunded");
  assertEquals(refundStatus(1000, 1200), "refunded"); // over-refund clamps to full
});

Deno.test("mapEventStatus covers the new events (charge.refunded excluded)", () => {
  assertEquals(mapEventStatus("payment_intent.processing"), "processing");
  assertEquals(mapEventStatus("checkout.session.completed"), "paid");
  assertEquals(mapEventStatus("checkout.session.async_payment_failed"), "failed");
  assertEquals(mapEventStatus("checkout.session.expired"), "expired");
  // Refunds carry an amount, so the service resolves their status.
  assertEquals(mapEventStatus("charge.refunded"), null);
  assertEquals(mapEventStatus("invoice.whatever"), null);
});

Deno.test("withTransition appends the audit entry and accumulates refunds (FR-7)", () => {
  const base: Payment = {
    id: "p1",
    provider: "mock",
    providerId: "s1",
    status: "paid",
    amountCents: 1000,
    refundedCents: 0,
    currency: "usd",
    userId: "u1",
    transitions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const once = withTransition(base, {
    status: "partially_refunded",
    source: "admin",
    actorId: "admin-1",
    refundedCents: 400,
  });
  assertEquals(once.status, "partially_refunded");
  assertEquals(once.refundedCents, 400);
  assertEquals(once.transitions.length, 1);
  assertEquals(once.transitions[0]?.from, "paid");
  assertEquals(once.transitions[0]?.source, "admin");
  assertEquals(once.transitions[0]?.actorId, "admin-1");

  const twice = withTransition(once, {
    status: "refunded",
    source: "webhook",
    eventId: "evt_1",
    refundedCents: 600,
  });
  assertEquals(twice.refundedCents, 1000); // accumulated, not overwritten
  assertEquals(twice.transitions.length, 2);
  assertEquals(twice.transitions[1]?.eventId, "evt_1");
});

Deno.test("parseRefundDto validates amount and reason", () => {
  assertEquals(parseRefundDto({}), {}); // full refund
  assertEquals(parseRefundDto({ amountCents: 500 }), { amountCents: 500 });
  assertEquals(
    parseRefundDto({ amountCents: 500, reason: "duplicate" }),
    { amountCents: 500, reason: "duplicate" },
  );
  assertThrows(() => parseRefundDto({ amountCents: 0 }), Error);
  assertThrows(() => parseRefundDto({ amountCents: 1.5 }), Error);
  assertThrows(() => parseRefundDto({ reason: "because" }), Error);
});
