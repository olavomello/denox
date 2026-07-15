/**
 * Payment persistence contract + in-memory implementation, and the
 * webhook-idempotency event ledger.
 */

import type {
  NewPayment,
  Payment,
  PaymentStatus,
  PaymentTransition,
} from "@/api/payments/payment.model.ts";

/** A status change plus the audit metadata that explains it. */
export interface StatusChange {
  readonly status: PaymentStatus;
  readonly source: PaymentTransition["source"];
  readonly eventId?: string;
  readonly actorId?: string;
  /** Cents refunded BY THIS CHANGE (accumulated into refundedCents). */
  readonly refundedCents?: number;
}

/**
 * Builds the updated record: new status, accumulated refunds, appended
 * transition. Shared by both drivers so the audit trail cannot diverge.
 *
 * @param current Stored payment.
 * @param change Status change with its provenance.
 * @returns Updated payment.
 */
export function withTransition(current: Payment, change: StatusChange): Payment {
  const at = new Date().toISOString();
  const transition: PaymentTransition = {
    from: current.status,
    to: change.status,
    at,
    source: change.source,
    ...(change.eventId !== undefined ? { eventId: change.eventId } : {}),
    ...(change.actorId !== undefined ? { actorId: change.actorId } : {}),
    ...(change.refundedCents !== undefined ? { refundedCents: change.refundedCents } : {}),
  };
  return {
    ...current,
    status: change.status,
    refundedCents: current.refundedCents + (change.refundedCents ?? 0),
    transitions: [...current.transitions, transition],
    updatedAt: at,
    ...(change.status === "paid" && current.paidAt === undefined ? { paidAt: at } : {}),
  };
}

/** Storage contract for payments. */
export interface PaymentRepository {
  create(data: NewPayment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByProviderId(providerId: string): Promise<Payment | null>;
  findAll(): Promise<readonly Payment[]>;
  /** Applies a status change together with its audit entry. */
  applyTransition(id: string, change: StatusChange): Promise<Payment>;
}

/** Records processed provider event ids (webhook idempotency). */
export interface EventLedger {
  /** Marks the id as seen. @returns true when it was already seen. */
  seen(eventId: string): Promise<boolean>;
}

/** In-memory {@link PaymentRepository} (development/tests). */
export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly payments = new Map<string, Payment>();
  private readonly byProvider = new Map<string, string>();

  /** Persists a new payment. */
  create(data: NewPayment): Promise<Payment> {
    const now = new Date().toISOString();
    const payment: Payment = {
      id: crypto.randomUUID(),
      ...data,
      refundedCents: 0,
      transitions: [],
      createdAt: now,
      updatedAt: now,
    };
    this.payments.set(payment.id, payment);
    this.byProvider.set(payment.providerId, payment.id);
    return Promise.resolve(payment);
  }

  /** @returns The payment, or null. */
  findById(id: string): Promise<Payment | null> {
    return Promise.resolve(this.payments.get(id) ?? null);
  }

  /** @returns The payment for a provider session id, or null. */
  findByProviderId(providerId: string): Promise<Payment | null> {
    const id = this.byProvider.get(providerId);
    return Promise.resolve(id === undefined ? null : this.payments.get(id) ?? null);
  }

  /** @returns Every payment (newest first). */
  findAll(): Promise<readonly Payment[]> {
    return Promise.resolve(
      [...this.payments.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  /** Applies a status change together with its audit entry. */
  applyTransition(id: string, change: StatusChange): Promise<Payment> {
    const current = this.payments.get(id);
    if (current === undefined) throw new Error(`Payment ${id} not found`);
    const updated = withTransition(current, change);
    this.payments.set(id, updated);
    return Promise.resolve(updated);
  }
}

/** In-memory {@link EventLedger}. */
export class InMemoryEventLedger implements EventLedger {
  private readonly ids = new Set<string>();

  /** Marks and reports prior occurrence. */
  seen(eventId: string): Promise<boolean> {
    if (this.ids.has(eventId)) return Promise.resolve(true);
    this.ids.add(eventId);
    return Promise.resolve(false);
  }
}
