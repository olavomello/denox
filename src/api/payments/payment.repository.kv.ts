/**
 * Deno KV payment persistence: primary record plus secondary indexes —
 * ["payments_by_provider_id", providerId] for O(1) webhook resolution and
 * ["payments_by_user", userId, id] (spec: kept as an investment; no
 * endpoint consumes it in this cycle). Event ledger entries expire via
 * native KV TTL.
 */

import type { NewPayment, Payment } from "@/api/payments/payment.model.ts";
import type {
  EventLedger,
  PaymentRepository,
  StatusChange,
} from "@/api/payments/payment.repository.ts";
import { withTransition } from "@/api/payments/payment.repository.ts";

const EVENT_TTL_MS = 24 * 60 * 60 * 1000;

/** Deno KV {@link PaymentRepository}. */
export class KvPaymentRepository implements PaymentRepository {
  constructor(private readonly kv: Deno.Kv) {}

  /** Persists a new payment atomically with its indexes. */
  async create(data: NewPayment): Promise<Payment> {
    const now = new Date().toISOString();
    const payment: Payment = {
      id: crypto.randomUUID(),
      ...data,
      refundedCents: 0,
      transitions: [],
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.kv.atomic()
      .set(["payments", payment.id], payment)
      .set(["payments_by_provider_id", payment.providerId], payment.id)
      .set(["payments_by_user", payment.userId, payment.id], payment.id)
      .commit();
    if (!result.ok) throw new Error("Failed to persist payment");
    return payment;
  }

  /** @returns The payment, or null. */
  async findById(id: string): Promise<Payment | null> {
    return (await this.kv.get<Payment>(["payments", id])).value;
  }

  /** @returns The payment for a provider session id, or null. */
  async findByProviderId(providerId: string): Promise<Payment | null> {
    const ref = await this.kv.get<string>(["payments_by_provider_id", providerId]);
    if (ref.value === null) return null;
    return await this.findById(ref.value);
  }

  /** @returns Every payment (newest first). */
  async findAll(): Promise<readonly Payment[]> {
    const payments: Payment[] = [];
    for await (const entry of this.kv.list<Payment>({ prefix: ["payments"] })) {
      payments.push(entry.value);
    }
    return payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Applies a status change together with its audit entry. */
  async applyTransition(id: string, change: StatusChange): Promise<Payment> {
    const current = await this.findById(id);
    if (current === null) throw new Error(`Payment ${id} not found`);
    const updated = withTransition(current, change);
    await this.kv.set(["payments", id], updated);
    return updated;
  }
}

/** Deno KV {@link EventLedger} with 24h TTL entries. */
export class KvEventLedger implements EventLedger {
  constructor(private readonly kv: Deno.Kv) {}

  /** Marks and reports prior occurrence. */
  async seen(eventId: string): Promise<boolean> {
    const existing = await this.kv.get(["payment_events", eventId]);
    if (existing.value !== null) return true;
    await this.kv.set(["payment_events", eventId], true, { expireIn: EVENT_TTL_MS });
    return false;
  }
}
