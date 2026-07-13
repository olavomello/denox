/**
 * Payment domain model.
 */

/**
 * Payment lifecycle. States marked reserved have no producing event in
 * this cycle (spec decision): they exist so the type never breaks when
 * future events/refund support land.
 */
export type PaymentStatus =
  | "pending"
  | "processing" // reserved
  | "paid"
  | "failed"
  | "cancelled" // reserved
  | "expired"
  | "refunded"; // reserved

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
export type NewPayment = Omit<Payment, "id" | "createdAt" | "updatedAt" | "paidAt">;
