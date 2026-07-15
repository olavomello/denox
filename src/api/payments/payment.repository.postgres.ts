/**
 * Postgres {@link PaymentRepository} and {@link EventLedger}. Nested shapes
 * (productSnapshot, metadata, transitions) ride in JSONB; the transition
 * audit trail persists via the shared withTransition builder.
 */

import type { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import type { NewPayment, Payment } from "@/api/payments/payment.model.ts";
import type {
  EventLedger,
  PaymentRepository,
  StatusChange,
} from "@/api/payments/payment.repository.ts";
import { withTransition } from "@/api/payments/payment.repository.ts";

interface PaymentRow {
  id: string;
  provider: string;
  provider_id: string;
  status: string;
  amount_cents: number;
  refunded_cents: number;
  currency: string;
  description: string | null;
  product_id: string | null;
  product_snapshot: Payment["productSnapshot"] | null;
  user_id: string;
  metadata: Record<string, string> | null;
  transitions: Payment["transitions"];
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/** @returns Domain payment from a row. */
function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    provider: row.provider,
    providerId: row.provider_id,
    status: row.status as Payment["status"],
    amountCents: row.amount_cents,
    refundedCents: row.refunded_cents,
    currency: row.currency,
    ...(row.description !== null ? { description: row.description } : {}),
    ...(row.product_id !== null ? { productId: row.product_id } : {}),
    ...(row.product_snapshot !== null ? { productSnapshot: row.product_snapshot } : {}),
    userId: row.user_id,
    ...(row.metadata !== null ? { metadata: row.metadata } : {}),
    transitions: row.transitions ?? [],
    ...(row.paid_at !== null ? { paidAt: row.paid_at.toISOString() } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Postgres-backed payment store. */
export class PostgresPaymentRepository implements PaymentRepository {
  constructor(private readonly pool: Pool) {}

  /** Persists a new payment. */
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
    const client = await this.pool.connect();
    try {
      await client.queryObject(
        `INSERT INTO payments (id, provider, provider_id, status, amount_cents, refunded_cents,
           currency, description, product_id, product_snapshot, user_id, metadata, transitions,
           paid_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          payment.id,
          payment.provider,
          payment.providerId,
          payment.status,
          payment.amountCents,
          payment.refundedCents,
          payment.currency,
          payment.description ?? null,
          payment.productId ?? null,
          payment.productSnapshot ? JSON.stringify(payment.productSnapshot) : null,
          payment.userId,
          payment.metadata ? JSON.stringify(payment.metadata) : null,
          JSON.stringify(payment.transitions),
          payment.paidAt ?? null,
          payment.createdAt,
          payment.updatedAt,
        ],
      );
      return payment;
    } finally {
      client.release();
    }
  }

  /** @returns The payment with the given id, or null. */
  async findById(id: string): Promise<Payment | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<PaymentRow>(
        "SELECT * FROM payments WHERE id = $1",
        [id],
      );
      return result.rows[0] ? toPayment(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /** @returns The payment for a provider id, or null. */
  async findByProviderId(providerId: string): Promise<Payment | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<PaymentRow>(
        "SELECT * FROM payments WHERE provider_id = $1",
        [providerId],
      );
      return result.rows[0] ? toPayment(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /** @returns Every payment, newest first. */
  async findAll(): Promise<readonly Payment[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<PaymentRow>(
        "SELECT * FROM payments ORDER BY created_at DESC",
      );
      return result.rows.map(toPayment);
    } finally {
      client.release();
    }
  }

  /** Applies a status change with its audit entry. */
  async applyTransition(id: string, change: StatusChange): Promise<Payment> {
    const current = await this.findById(id);
    if (current === null) throw new Error(`Payment ${id} not found`);
    const updated = withTransition(current, change);
    const client = await this.pool.connect();
    try {
      await client.queryObject(
        `UPDATE payments
         SET status = $2, refunded_cents = $3, transitions = $4, paid_at = $5, updated_at = $6
         WHERE id = $1`,
        [
          id,
          updated.status,
          updated.refundedCents,
          JSON.stringify(updated.transitions),
          updated.paidAt ?? null,
          updated.updatedAt,
        ],
      );
      return updated;
    } finally {
      client.release();
    }
  }
}

/** Postgres-backed idempotency ledger. */
export class PostgresEventLedger implements EventLedger {
  constructor(private readonly pool: Pool) {}

  /** @returns Whether the event was already processed (and records it). */
  async seen(eventId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject(
        `INSERT INTO _denox_payment_events (event_id) VALUES ($1)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId],
      );
      return (result.rowCount ?? 0) === 0;
    } finally {
      client.release();
    }
  }
}
