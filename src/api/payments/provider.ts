/**
 * Payment provider abstraction.
 *
 * The application layer only knows this interface; providers translate it
 * to their APIs. StripeProvider talks to Stripe's plain HTTPS REST
 * endpoints directly (form-urlencoded + Bearer) and verifies webhooks with
 * Web Crypto — no SDK, zero dependencies. MockProvider serves tests and
 * keyless development.
 */

import { site } from "@/config/site.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";

/** Input for creating a provider checkout. */
export interface CheckoutInput {
  readonly userId: string;
  readonly productId?: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly description?: string;
  readonly metadata?: Record<string, string>;
  /** Local payment id (round-trips through redirects/metadata). */
  readonly paymentId: string;
  readonly productName?: string;
}

/** Provider-side checkout session. */
export interface ProviderCheckout {
  readonly providerId: string;
  readonly url: string;
  readonly expiresAt?: Date;
}

/** A verified webhook event, normalized. */
export interface ProviderEvent {
  readonly id: string;
  readonly provider: string;
  readonly providerId: string;
  readonly type: string;
  readonly occurredAt: Date;
  readonly payload: unknown;
}

/** Refund request (amount omitted = full refund). */
export interface RefundInput {
  /** Provider checkout/session id of the payment being refunded. */
  readonly providerId: string;
  /** Cents to refund; omit for the full remaining amount. */
  readonly amountCents?: number;
  /** Stripe-compatible reason. */
  readonly reason?: "duplicate" | "fraudulent" | "requested_by_customer";
}

/** Provider's answer to a refund. */
export interface ProviderRefund {
  /** Provider refund id (audit). */
  readonly refundId: string;
  /** Cents actually refunded by this call. */
  readonly refundedCents: number;
}

/** Contract every payment provider implements. */
export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<ProviderCheckout>;
  /** Verifies the signature (raw body!) and normalizes the event. */
  parseWebhook(rawBody: string, signature: string): Promise<ProviderEvent>;
  /** Refunds a payment (full or partial) — money moves here. */
  refund(input: RefundInput): Promise<ProviderRefund>;
}

const encoder = new TextEncoder();

/** Constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Hex HMAC-SHA256 via Web Crypto. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Replay tolerance for webhook timestamps. */
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

/** Options for {@link StripeProvider} (injectable for tests). */
export interface StripeOptions {
  readonly secretKey: string;
  readonly webhookSecret: string;
  /** Override for tests/proxies; defaults to the live API. */
  readonly apiBase?: string;
  /** Clock (injectable for stale-timestamp tests). */
  readonly now?: () => number;
}

/** Stripe Checkout Sessions over plain REST. */
export class StripeProvider implements PaymentProvider {
  private readonly apiBase: string;
  private readonly now: () => number;

  constructor(private readonly options: StripeOptions) {
    this.apiBase = options.apiBase ?? "https://api.stripe.com";
    this.now = options.now ?? Date.now;
  }

  /**
   * Creates a hosted Checkout Session.
   *
   * @param input Checkout parameters (server-side amounts).
   * @returns Provider id and redirect URL.
   */
  async createCheckout(input: CheckoutInput): Promise<ProviderCheckout> {
    const base = site.app.url.replace(/\/+$/, "");
    const success = `${base}${site.payments.successPath}?payment=${input.paymentId}`;
    const cancel = `${base}${site.payments.cancelPath}?payment=${input.paymentId}`;
    const body = new URLSearchParams({
      "mode": "payment",
      "line_items[0][price_data][currency]": input.currency,
      "line_items[0][price_data][unit_amount]": String(input.amountCents),
      "line_items[0][price_data][product_data][name]": input.productName ??
        input.description ?? "Payment",
      "line_items[0][quantity]": "1",
      "success_url": success,
      "cancel_url": cancel,
      "metadata[payment_id]": input.paymentId,
    });
    for (const [key, value] of Object.entries(input.metadata ?? {})) {
      body.set(`metadata[${key}]`, value);
    }
    const response = await fetch(`${this.apiBase}/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${this.options.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException("Payment provider rejected the checkout", {
        status: response.status,
        detail: detail.slice(0, 300),
      });
    }
    const session = await response.json() as {
      id: string;
      url: string;
      expires_at?: number;
    };
    return {
      providerId: session.id,
      url: session.url,
      ...(session.expires_at !== undefined
        ? { expiresAt: new Date(session.expires_at * 1000) }
        : {}),
    };
  }

  /**
   * Refunds through Stripe's REST API: the session gives us the payment
   * intent, and refunds are created against the intent.
   *
   * @param input Refund request (amount omitted = full).
   * @returns Provider refund id and cents refunded.
   * @throws {BadRequestException} When the session or the refund is rejected.
   */
  async refund(input: RefundInput): Promise<ProviderRefund> {
    const sessionResponse = await fetch(
      `${this.apiBase}/v1/checkout/sessions/${input.providerId}`,
      { headers: { "authorization": `Bearer ${this.options.secretKey}` } },
    );
    if (!sessionResponse.ok) {
      throw new BadRequestException("Payment provider could not load the session", {
        status: sessionResponse.status,
      });
    }
    const session = await sessionResponse.json() as { payment_intent?: string | null };
    const intent = session.payment_intent ?? null;
    if (intent === null || intent === "") {
      throw new BadRequestException("Payment has no charge to refund");
    }

    const body = new URLSearchParams({ payment_intent: intent });
    if (input.amountCents !== undefined) body.set("amount", String(input.amountCents));
    if (input.reason !== undefined) body.set("reason", input.reason);

    const response = await fetch(`${this.apiBase}/v1/refunds`, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${this.options.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new BadRequestException("Payment provider rejected the refund", {
        status: response.status,
        detail: detail.slice(0, 300),
      });
    }
    const refund = await response.json() as { id: string; amount: number };
    return { refundId: refund.id, refundedCents: refund.amount };
  }

  /**
   * Verifies `Stripe-Signature` (t=...,v1=HMAC(secret, "t.rawBody")) with
   * constant-time comparison and replay tolerance, then normalizes.
   *
   * @param rawBody Exact raw request body.
   * @param signature Stripe-Signature header value.
   * @returns Normalized event.
   * @throws {BadRequestException} On any verification failure.
   */
  async parseWebhook(rawBody: string, signature: string): Promise<ProviderEvent> {
    const parts = new Map(
      signature.split(",").map((pair) => pair.split("=") as [string, string]),
    );
    const timestamp = Number(parts.get("t"));
    const provided = parts.get("v1") ?? "";
    if (!Number.isInteger(timestamp) || provided === "") {
      throw new BadRequestException("Malformed webhook signature");
    }
    if (Math.abs(this.now() - timestamp * 1000) > SIGNATURE_TOLERANCE_MS) {
      throw new BadRequestException("Webhook timestamp outside tolerance");
    }
    const expected = await hmacHex(this.options.webhookSecret, `${timestamp}.${rawBody}`);
    if (!timingSafeEqual(expected, provided)) {
      throw new BadRequestException("Invalid webhook signature");
    }
    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      created: number;
      data: { object: { id: string } };
    };
    return {
      id: event.id,
      provider: "stripe",
      providerId: event.data.object.id,
      type: event.type,
      occurredAt: new Date(event.created * 1000),
      payload: event,
    };
  }
}

/** Deterministic provider for tests and keyless development. */
export class MockProvider implements PaymentProvider {
  /** Sequential ids for deterministic assertions. */
  private counter = 0;

  /** @returns A fake session with a predictable id. */
  createCheckout(input: CheckoutInput): Promise<ProviderCheckout> {
    this.counter += 1;
    return Promise.resolve({
      providerId: `mock_session_${this.counter}`,
      url: `https://checkout.mock.local/session/${this.counter}?payment=${input.paymentId}`,
    });
  }

  /** Echoes the requested refund (tests assert the service, not Stripe). */
  refund(input: RefundInput): Promise<ProviderRefund> {
    this.counter += 1;
    return Promise.resolve({
      refundId: `mock_refund_${this.counter}`,
      refundedCents: input.amountCents ?? 0,
    });
  }

  /** Accepts signature "mock-valid"; anything else fails like Stripe would. */
  parseWebhook(rawBody: string, signature: string): Promise<ProviderEvent> {
    if (signature !== "mock-valid") {
      return Promise.reject(new BadRequestException("Invalid webhook signature"));
    }
    const event = JSON.parse(rawBody) as { id: string; type: string; providerId: string };
    return Promise.resolve({
      id: event.id,
      provider: "mock",
      providerId: event.providerId,
      type: event.type,
      occurredAt: new Date(),
      payload: event,
    });
  }
}

/**
 * Builds the configured provider. Fail-fast: enabling stripe without its
 * keys aborts boot with a clear message.
 *
 * @returns Provider, or null when payments are disabled.
 */
export function createPaymentProvider(): PaymentProvider | null {
  if (site.payments.provider === "none") return null;
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
  if (secretKey === "" || webhookSecret === "") {
    throw new Error(
      'payments.provider is "stripe" but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are not set',
    );
  }
  const apiBase = Deno.env.get("STRIPE_API_BASE");
  return new StripeProvider({
    secretKey,
    webhookSecret,
    ...(apiBase !== undefined ? { apiBase } : {}),
  });
}
