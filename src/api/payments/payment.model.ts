/**
 * Payment domain model.
 */

/**
 * Payment lifecycle. Every state has a producing path:
 *
 * | Status               | Produced by                                    |
 * | -------------------- | ---------------------------------------------- |
 * | pending              | checkout created                               |
 * | processing           | payment_intent.processing (async methods)      |
 * | paid                 | checkout.session.completed                     |
 * | failed               | checkout.session.async_payment_failed          |
 * | cancelled            | session expired before any payment attempt     |
 * | expired              | session expired after a payment attempt        |
 * | partially_refunded   | charge.refunded (amount_refunded < amount)     |
 * | refunded             | charge.refunded (full) / our own refund call   |
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  | "partially_refunded"
  | "refunded";

/** Who caused a status change. */
export type TransitionSource = "webhook" | "admin" | "system";

/** One recorded status change — the audit trail. */
export interface PaymentTransition {
  readonly from: PaymentStatus;
  readonly to: PaymentStatus;
  readonly at: string;
  readonly source: TransitionSource;
  /** Provider event id (webhook-sourced transitions). */
  readonly eventId?: string;
  /** Admin user id (admin-sourced transitions). */
  readonly actorId?: string;
  /** Cents refunded by this transition, when it was a refund. */
  readonly refundedCents?: number;
}

/**
 * Legal transitions. Anything absent is rejected by the service, so a
 * malformed (or hostile, but signature-valid) event cannot corrupt a
 * record — e.g. pending → refunded can never happen.
 */
export const LEGAL_TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = Object
  .freeze({
    pending: ["processing", "paid", "failed", "cancelled", "expired"],
    processing: ["paid", "failed", "expired"],
    paid: ["partially_refunded", "refunded"],
    partially_refunded: ["partially_refunded", "refunded"],
    failed: [],
    cancelled: [],
    expired: [],
    refunded: [],
  });

/**
 * @param from Current status.
 * @param to Candidate status.
 * @returns Whether the transition is allowed.
 */
export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return (LEGAL_TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Snapshot of the purchased product at checkout time — purchase history
 * survives product edits/deletion. (Product `sku` inclusion: roadmap.)
 */
export interface ProductSnapshot {
  readonly id: string;
  readonly name: string;
  /** Present when the product carried a SKU at checkout time. */
  readonly sku?: string;
  readonly price: number;
}

export interface Payment {
  readonly id: string;
  readonly provider: string;
  readonly providerId: string;
  readonly status: PaymentStatus;
  /** Integer cents — never float money. */
  readonly amountCents: number;
  /** Cents refunded so far (0 until a refund happens). */
  readonly refundedCents: number;
  /** Audit trail: every status change, in order. */
  readonly transitions: readonly PaymentTransition[];
  readonly currency: string;
  readonly description?: string;
  readonly productId?: string;
  readonly productSnapshot?: ProductSnapshot;
  readonly userId: string;
  readonly metadata?: Record<string, string>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly paidAt?: string;
}

/** Fields required to persist a new payment. */
/**
 * Creation payload. The audit fields are initialized by the repository —
 * callers never invent a transition history.
 */
export type NewPayment = Omit<
  Payment,
  "id" | "createdAt" | "updatedAt" | "paidAt" | "refundedCents" | "transitions"
>;
