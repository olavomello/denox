/**
 * Payments service — checkout creation and webhook lifecycle.
 *
 * Server-side pricing: product checkouts read the amount exclusively from
 * the repository (client amounts are ignored in that mode) and persist a
 * product snapshot so purchase history survives edits/deletion. Webhooks
 * are idempotent through the event ledger.
 */

import type { CheckoutDto } from "@/api/payments/payment.dto.ts";
import type { Payment, PaymentStatus, ProductSnapshot } from "@/api/payments/payment.model.ts";
import type { EventLedger, PaymentRepository } from "@/api/payments/payment.repository.ts";
import type { PaymentProvider, ProviderEvent } from "@/api/payments/provider.ts";
import type { ProductService } from "@/api/products/product.service.ts";
import { site } from "@/config/site.ts";
import { logger } from "@/shared/logger.ts";

/** Checkout result returned to clients. */
export interface CheckoutResult {
  readonly paymentId: string;
  readonly status: PaymentStatus;
  readonly url: string;
}

/** Maps provider event types to payment statuses. */
export function mapEventStatus(type: string): PaymentStatus | null {
  switch (type) {
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
    const status = mapEventStatus(event.type);
    if (status === null) {
      logger.info("Unhandled webhook event type", { type: event.type });
      return;
    }
    const payment = await this.repository.findByProviderId(event.providerId);
    if (payment === null) {
      logger.warn("Webhook for unknown provider id", { providerId: event.providerId });
      return;
    }
    await this.repository.updateStatus(
      payment.id,
      status,
      status === "paid" ? new Date().toISOString() : undefined,
    );
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
