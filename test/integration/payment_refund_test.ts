/**
 * Integration tests — refunds and lifecycle over the wired service:
 * full/partial refunds, guards, webhook idempotency and the audit trail.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  InMemoryEventLedger,
  InMemoryPaymentRepository,
} from "@/api/payments/payment.repository.ts";
import { PaymentService } from "@/api/payments/payment.service.ts";
import { MockProvider } from "@/api/payments/provider.ts";
import { productService } from "@/api/products/product.routes.ts";
import type { ProviderEvent } from "@/api/payments/provider.ts";

/** Fresh service with in-memory storage and the mock provider. */
function service(): { service: PaymentService; repository: InMemoryPaymentRepository } {
  const repository = new InMemoryPaymentRepository();
  return {
    repository,
    service: new PaymentService(
      repository,
      new InMemoryEventLedger(),
      new MockProvider(),
      productService,
    ),
  };
}

/** Creates a paid payment of `amountCents` and returns its id. */
async function paidPayment(svc: PaymentService, amountCents = 1000): Promise<string> {
  const { paymentId } = await svc.checkout("user-1", { kind: "custom", amountCents });
  const payment = await svc.getById(paymentId);
  await svc.applyWebhook({
    id: `evt_paid_${paymentId}`,
    provider: "mock",
    providerId: payment!.providerId,
    type: "checkout.session.completed",
    occurredAt: new Date(),
    payload: {},
  });
  return paymentId;
}

/** Builds a charge.refunded event carrying a cumulative amount. */
function refundEvent(providerId: string, amountRefunded: number, id = "evt_refund"): ProviderEvent {
  return {
    id,
    provider: "mock",
    providerId,
    type: "charge.refunded",
    occurredAt: new Date(),
    payload: { data: { object: { amount_refunded: amountRefunded } } },
  };
}

Deno.test("FR-1: full refund sets refunded with an admin transition", async () => {
  const { service: svc } = service();
  const id = await paidPayment(svc);

  const refunded = await svc.refund(id, "admin-1", {});
  assertEquals(refunded.status, "refunded");
  assertEquals(refunded.refundedCents, 1000);

  const last = refunded.transitions.at(-1);
  assertEquals(last?.from, "paid");
  assertEquals(last?.to, "refunded");
  assertEquals(last?.source, "admin");
  assertEquals(last?.actorId, "admin-1");
  assertEquals(last?.refundedCents, 1000);
});

Deno.test("FR-2: partial refunds accumulate until the total is reached", async () => {
  const { service: svc } = service();
  const id = await paidPayment(svc);

  const first = await svc.refund(id, "admin-1", { amountCents: 300 });
  assertEquals(first.status, "partially_refunded");
  assertEquals(first.refundedCents, 300);

  const second = await svc.refund(id, "admin-1", { amountCents: 700 });
  assertEquals(second.status, "refunded"); // reached the total
  assertEquals(second.refundedCents, 1000);
  assertEquals(second.transitions.length, 3); // paid + two refunds
});

Deno.test("FR-3: guards — non-paid 409, over-refund 400, already refunded 409", async () => {
  const { service: svc } = service();

  // Pending payments are not refundable.
  const { paymentId: pending } = await svc.checkout("user-1", {
    kind: "custom",
    amountCents: 500,
  });
  await svc.refund(pending, "admin-1", {}).then(
    () => {
      throw new Error("should have rejected");
    },
    (error: { status?: number }) => assertEquals(error.status, 409),
  );

  // Over-refund is rejected with the refundable remainder in the detail.
  const id = await paidPayment(svc, 1000);
  await svc.refund(id, "admin-1", { amountCents: 1001 }).then(
    () => {
      throw new Error("should have rejected");
    },
    (error: { status?: number }) => assertEquals(error.status, 400),
  );

  // Fully refunded payments cannot be refunded twice.
  await svc.refund(id, "admin-1", {});
  await svc.refund(id, "admin-1", { amountCents: 1 }).then(
    () => {
      throw new Error("should have rejected");
    },
    (error: { status?: number }) => assertEquals(error.status, 409),
  );
});

Deno.test("FR-4: our refund and its webhook do not double-count", async () => {
  const { service: svc } = service();
  const id = await paidPayment(svc, 1000);
  const payment = await svc.getById(id);

  await svc.refund(id, "admin-1", { amountCents: 400 });
  // Stripe then delivers charge.refunded with the CUMULATIVE amount.
  await svc.applyWebhook(refundEvent(payment!.providerId, 400));

  const after = await svc.getById(id);
  assertEquals(after?.refundedCents, 400); // not 800
  assertEquals(after?.status, "partially_refunded");

  // A later webhook reporting more (refund issued in Stripe's dashboard)
  // records only the delta.
  await svc.applyWebhook(refundEvent(payment!.providerId, 1000, "evt_refund_2"));
  const final = await svc.getById(id);
  assertEquals(final?.refundedCents, 1000);
  assertEquals(final?.status, "refunded");
  assertEquals(final?.transitions.at(-1)?.source, "webhook");
});

Deno.test("FR-5: payment_intent.processing then completed reaches paid", async () => {
  const { service: svc } = service();
  const { paymentId } = await svc.checkout("user-1", { kind: "custom", amountCents: 800 });
  const payment = await svc.getById(paymentId);

  await svc.applyWebhook({
    id: "evt_processing",
    provider: "mock",
    providerId: payment!.providerId,
    type: "payment_intent.processing",
    occurredAt: new Date(),
    payload: {},
  });
  assertEquals((await svc.getById(paymentId))?.status, "processing");

  await svc.applyWebhook({
    id: "evt_completed",
    provider: "mock",
    providerId: payment!.providerId,
    type: "checkout.session.completed",
    occurredAt: new Date(),
    payload: {},
  });
  const paid = await svc.getById(paymentId);
  assertEquals(paid?.status, "paid");
  assertEquals(paid?.paidAt !== undefined, true);
});

Deno.test("FR-6: illegal transitions leave the record untouched", async () => {
  const { service: svc } = service();
  const { paymentId } = await svc.checkout("user-1", { kind: "custom", amountCents: 900 });
  const payment = await svc.getById(paymentId);

  // A signature-valid but nonsensical event: pending → refunded.
  await svc.applyWebhook(refundEvent(payment!.providerId, 900));
  const after = await svc.getById(paymentId);
  assertEquals(after?.status, "pending"); // rejected
  assertEquals(after?.refundedCents, 0);
  assertEquals(after?.transitions.length, 0);
});

Deno.test("FR-7: the audit trail records source and provenance in order", async () => {
  const { service: svc } = service();
  const id = await paidPayment(svc, 1000);
  await svc.refund(id, "admin-7", { amountCents: 250 });

  const payment = await svc.getById(id);
  const [first, second] = payment!.transitions;
  assertEquals(first?.to, "paid");
  assertEquals(first?.source, "webhook");
  assertStringIncludes(first?.eventId ?? "", "evt_paid_");
  assertEquals(second?.to, "partially_refunded");
  assertEquals(second?.source, "admin");
  assertEquals(second?.actorId, "admin-7");
});
