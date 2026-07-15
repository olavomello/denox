/**
 * Payments service — checkout creation and webhook lifecycle.
 *
 * Server-side pricing: product checkouts read the amount exclusively from
 * the repository (client amounts are ignored in that mode) and persist a
 * product snapshot so purchase history survives edits/deletion. Webhooks
 * are idempotent through the event ledger.
 */

import type { CheckoutDto, RefundDto } from "@/api/payments/payment.dto.ts";
import type { Payment, PaymentStatus, ProductSnapshot } from "@/api/payments/payment.model.ts";
import { canTransition } from "@/api/payments/payment.model.ts";
import type { EventLedger, PaymentRepository } from "@/api/payments/payment.repository.ts";
import type { PaymentProvider, ProviderEvent } from "@/api/payments/provider.ts";
import type { ProductService } from "@/api/products/product.service.ts";
import { site } from "@/config/site.ts";
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from "@/shared/exceptions/app_exception.ts";
import { logger } from "@/shared/logger.ts";

/**
 * Reads the cumulative refunded amount from a Stripe charge event.
 *
 * @param payload Raw event payload.
 * @returns Total cents refunded on the charge, or null when unreadable.
 */
function refundedCentsFromEvent(payload: unknown): number | null {
  const charge = (payload as { data?: { object?: { amount_refunded?: unknown } } })?.data?.object;
  const amount = charge?.amount_refunded;
  return typeof amount === "number" ? amount : null;
}

/** Checkout result returned to clients. */
export interface CheckoutResult {
  readonly paymentId: string;
  readonly status: PaymentStatus;
  readonly url: string;
}

/**
 * Maps provider event types to payment statuses.
 *
 * `charge.refunded` is absent on purpose: refunds carry an amount, so the
 * service decides between `partially_refunded` and `refunded` — a status
 * alone cannot express it.
 */
export function mapEventStatus(type: string): PaymentStatus | null {
  switch (type) {
    case "payment_intent.processing":
      return "processing";
    case "checkout.session.completed":
      return "paid";
    case "checkout.session.async_payment_failed":
      return "failed";
    case "checkout.session.expired":
      return "expired";
    default:
      return null;
  }
}

/**
 * Resolves the status a refund lands on.
 *
 * @param amountCents Total charged.
 * @param refundedCents Cents refunded in total (after this refund).
 * @returns The resulting status.
 */
export function refundStatus(amountCents: number, refundedCents: number): PaymentStatus {
  return refundedCents >= amountCents ? "refunded" : "partially_refunded";
}

/** Payments business rules. */
export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly ledger: EventLedger,
    private readonly provider: PaymentProvider,
    private readonly products: ProductService,
  ) {}

  /**
   * Creates a provider checkout and persists the pending payment.
   *
   * @param userId Authenticated user.
   * @param dto Validated checkout payload.
   * @returns Payment id, status and the hosted checkout URL.
   * @throws {NotFoundException} When the referenced product is missing.
   */
  async checkout(userId: string, dto: CheckoutDto): Promise<CheckoutResult> {
    let amountCents: number;
    let description: string | undefined;
    let productId: string | undefined;
    let productSnapshot: ProductSnapshot | undefined;
    let productName: string | undefined;

    if (dto.kind === "product") {
      const product = await this.products.getById(dto.productId); // 404s when missing
      amountCents = Math.round(product.price * 100);
      productId = product.id;
      productName = product.name;
      productSnapshot = {
        id: product.id,
        name: product.name,
        price: product.price,
        ...(product.sku !== undefined ? { sku: product.sku } : {}),
      };
    } else {
      amountCents = dto.amountCents;
      description = dto.description;
    }
    const currency = (dto.kind === "custom" ? dto.currency : undefined) ??
      site.payments.currency;

    const paymentId = crypto.randomUUID();
    const session = await this.provider.createCheckout({
      userId,
      amountCents,
      currency,
      paymentId,
      ...(productId !== undefined ? { productId } : {}),
      ...(productName !== undefined ? { productName } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
    });

    const payment = await this.repository.create({
      provider: site.payments.provider,
      providerId: session.providerId,
      status: "pending",
      amountCents,
      currency,
      userId,
      ...(description !== undefined ? { description } : {}),
      ...(productId !== undefined ? { productId } : {}),
      ...(productSnapshot !== undefined ? { productSnapshot } : {}),
      ...(dto.metadata !== undefined ? { metadata: dto.metadata } : {}),
    });
    return { paymentId: payment.id, status: payment.status, url: session.url };
  }

  /**
   * Applies a verified webhook event (idempotent).
   *
   * @param event Normalized provider event.
   */
  async applyWebhook(event: ProviderEvent): Promise<void> {
    if (await this.ledger.seen(event.id)) {
      logger.info("Webhook event replayed; ignoring", { eventId: event.id });
      return;
    }
    const payment = await this.repository.findByProviderId(event.providerId);
    if (payment === null) {
      logger.warn("Webhook for unknown provider id", { providerId: event.providerId });
      return;
    }

    // Refund events carry an amount, so they resolve their own status
    // (partial vs full) — and must not double-count what our own refund
    // call already recorded (FR-4).
    if (event.type === "charge.refunded") {
      const refundedTotal = refundedCentsFromEvent(event.payload) ?? payment.amountCents;
      const delta = refundedTotal - payment.refundedCents;
      if (delta <= 0) {
        logger.info("Refund webhook already accounted for; ignoring", { id: payment.id });
        return;
      }
      const status = refundStatus(payment.amountCents, refundedTotal);
      if (!canTransition(payment.status, status)) {
        logger.warn("Illegal refund transition rejected", {
          id: payment.id,
          from: payment.status,
          to: status,
        });
        return;
      }
      await this.repository.applyTransition(payment.id, {
        status,
        source: "webhook",
        eventId: event.id,
        refundedCents: delta,
      });
      return;
    }

    const status = mapEventStatus(event.type);
    if (status === null) {
      logger.info("Unhandled webhook event type", { type: event.type });
      return;
    }
    if (!canTransition(payment.status, status)) {
      // A signature-valid but out-of-order (or hostile) event cannot
      // corrupt the record: pending → refunded, paid → pending, etc.
      logger.warn("Illegal transition rejected", {
        id: payment.id,
        from: payment.status,
        to: status,
      });
      return;
    }
    await this.repository.applyTransition(payment.id, {
      status,
      source: "webhook",
      eventId: event.id,
    });
  }

  /**
   * Refunds a payment (admin action — money moves here).
   *
   * @param id Payment id.
   * @param actorId Admin performing the refund (audit trail).
   * @param dto Validated refund request (empty = full refund).
   * @returns The updated payment.
   * @throws NotFoundException / ConflictException / ValidationException.
   */
  async refund(id: string, actorId: string, dto: RefundDto): Promise<Payment> {
    const payment = await this.repository.findById(id);
    if (payment === null) {
      throw new NotFoundException("Payment not found");
    }
    const remaining = payment.amountCents - payment.refundedCents;
    if (payment.status !== "paid" && payment.status !== "partially_refunded") {
      throw new ConflictException(
        `Only paid payments can be refunded (this one is "${payment.status}")`,
      );
    }
    if (remaining <= 0) {
      throw new ConflictException("Payment is already fully refunded");
    }
    const amountCents = dto.amountCents ?? remaining;
    if (amountCents > remaining) {
      throw new ValidationException("Refund exceeds the refundable amount", {
        fields: { amountCents: `at most ${remaining} cents remain refundable` },
      });
    }

    const result = await this.provider.refund({
      providerId: payment.providerId,
      amountCents,
      ...(dto.reason !== undefined ? { reason: dto.reason } : {}),
    });
    const refunded = result.refundedCents > 0 ? result.refundedCents : amountCents;
    const status = refundStatus(payment.amountCents, payment.refundedCents + refunded);

    logger.info("Payment refunded", { id, refunded, actorId, refundId: result.refundId });
    return await this.repository.applyTransition(id, {
      status,
      source: "admin",
      actorId,
      refundedCents: refunded,
    });
  }

  /** @returns The payment, or null. */
  async getById(id: string): Promise<Payment | null> {
    return await this.repository.findById(id);
  }

  /** @returns Every payment (admin listing). */
  async list(): Promise<readonly Payment[]> {
    return await this.repository.findAll();
  }
}
