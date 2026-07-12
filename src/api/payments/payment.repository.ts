/**
 * Payment persistence contract + in-memory implementation, and the
 * webhook-idempotency event ledger.
 */

import type { NewPayment, Payment, PaymentStatus } from "@/api/payments/payment.model.ts";

/** Storage contract for payments. */
export interface PaymentRepository {
  create(data: NewPayment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByProviderId(providerId: string): Promise<Payment | null>;
  findAll(): Promise<readonly Payment[]>;
  updateStatus(id: string, status: PaymentStatus, paidAt?: string): Promise<Payment>;
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
    const payment: Payment = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
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

  /** Applies a status transition. */
  updateStatus(id: string, status: PaymentStatus, paidAt?: string): Promise<Payment> {
    const current = this.payments.get(id);
    if (current === undefined) throw new Error(`Payment ${id} not found`);
    const updated: Payment = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      ...(paidAt !== undefined ? { paidAt } : {}),
    };
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
