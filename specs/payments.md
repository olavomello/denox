---
feature: payments
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-11
---

# Payments — Specification (0.7)

## Objective

Provide DenoX with a complete payment capability behind a provider abstraction. The first
implementation targets Stripe using its HTTPS REST API directly (no SDK), while allowing additional
providers to be added later without changing the application layer. Payments are initiated by the
application through a checkout request and finalized asynchronously through verified provider
webhooks. Implementation uses only native Deno capabilities (fetch + Web Crypto).

## Scope

### In scope

**1. Provider interface — `src/api/payments/provider.ts`**

```ts
export interface CheckoutInput {
  userId: string;
  productId?: string;
  amountCents?: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface ProviderCheckout {
  providerId: string;
  url: string;
  expiresAt?: Date;
}

export interface ProviderEvent {
  id: string;
  provider: string;
  providerId: string;
  type: string;
  occurredAt: Date;
  payload: unknown;
}

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<ProviderCheckout>;
  parseWebhook(rawBody: string, signature: string): Promise<ProviderEvent>;
}
```

Implementations:

- **StripeProvider** — Checkout Sessions via HTTPS REST (form-urlencoded), Web Crypto webhook
  signature verification, constant-time comparison, 5-minute replay tolerance.
- **MockProvider** — deterministic ids, signed webhook generation, test utilities.

Provider selected through `payments.provider: "none" | "stripe"` (default **none**). When `stripe`,
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` become mandatory (fail-fast in env.ts).

**2. Payment slice — `src/api/payments/`** (model, dto, repositories memory+KV, service, controller,
routes)

```ts
Payment {
  id, provider, providerId, status,
  amountCents, currency, description?,
  productId?, productSnapshot?, userId, metadata?,
  createdAt, updatedAt, paidAt?
}
```

Status enum (complete by design; the states below marked _reserved_ have no producing event in this
cycle and exist so the type never breaks when future events/refund support land):

```
pending | processing (reserved) | paid | failed |
cancelled (reserved) | expired | refunded (reserved)
```

Secondary KV indexes:

- `["payments_by_provider_id", providerId]` — O(1) webhook resolution.
- `["payments_by_user", userId]` — future queries (kept as an investment; no endpoint consumes it in
  this cycle by decision).

**3. Product snapshot**

When a checkout references a product, a lightweight snapshot is persisted inside the payment,
preserving purchase history even if the product changes or is deleted later:

```ts
productSnapshot { id, name, price }
```

_(A product `sku` field — and its inclusion in this snapshot — is tracked as a future roadmap item,
not part of this cycle.)_

**4. Endpoints**

- `POST /api/payments/checkout` (**requireAuth** — payment linked to the session user): body
  `{ productId }` **or** `{ amountCents, currency,
  description }`. With `productId`: the amount
  comes **exclusively** from the database (client amounts ignored — price tampering closed by
  design) and the currency comes from configuration (per-product currency is a noted future
  extension). Creates the provider checkout, persists a `pending` Payment with the snapshot, returns
  `{ paymentId, status, url }`.
- `POST /api/payments/webhook` — public; **raw-body signature verified before any JSON parsing**;
  idempotent. Stripe events mapped: `checkout.session.completed` → paid (+`paidAt`),
  `checkout.session.async_payment_failed` → failed, `checkout.session.expired` → expired. Unknown
  provider ids → HTTP 200 + structured warning (no information leakage). Processed provider event
  ids stored in KV for 24 hours (`expireIn`).
- `GET /api/payments/:id` — owner 200, admin 200, other user 403, anonymous 401.
- `GET /api/payments` — admin only.
- Redirects: `payments.successPath` / `payments.cancelPath` (default `/`), framework appends
  `?payment=<paymentId>`. Dedicated result pages remain out of scope (Stripe hosts checkout).

**5. Configuration & environment**

```ts
payments: { provider: "none", currency: "usd", successPath: "/", cancelPath: "/" }
```

Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_API_BASE` (testing/proxy environments
only — also what points integration tests at a local mock server).

### Out of scope

Subscriptions, recurring billing, refunds API, disputes, saved payment methods, carts, taxes,
invoices, payouts, additional providers (the abstraction should make them straightforward), product
`sku` (future roadmap item, see above), per-product currency.

## Functional Requirements

- FR-1: provider `none` → payment routes answer HTTP 501.
- FR-2: checkout with `productId` always uses the stored product price; client-supplied prices are
  ignored; the payment carries the product snapshot.
- FR-3: anonymous checkout → 401; authenticated checkout creates a `pending` payment linked to the
  current user with `{ paymentId, status,
  url }` returned.
- FR-4: a valid webhook updates the payment status and `updatedAt`; on success, `paidAt` is
  recorded.
- FR-5: invalid signatures, stale timestamps or modified payloads → 400; no state changes.
- FR-6: webhook replay is idempotent — repeated provider event ids return 200 without changing
  payment state.
- FR-7: authorization matrix — owner 200, admin 200, other user 403, anonymous 401.
- FR-8: payments persist across application restart on the KV repository.

## Non Functional Requirements

- NFR-1: zero external dependencies (fetch + Web Crypto only).
- NFR-2: signature verification occurs before JSON parsing.
- NFR-3: secrets are never logged.
- NFR-4: money is always represented in integer cents.
- NFR-5: the entire test suite runs green without a Stripe account.

## Security Considerations

Constant-time HMAC comparison; five-minute replay tolerance; provider event idempotency; server-side
pricing; environment-only secrets; raw-body verification; fail-fast configuration; default provider
`none`; no client-controlled monetary values.

## Tests

Unit: DTO validation, signature verification (valid/tampered/stale), replay detection, status
mapping, provider abstraction. Integration: MockProvider + StripeProvider against a local mock
server, authorization matrix, checkout and webhook lifecycles, idempotency. E2E: KV persistence
across restart. Estimated 20–25 tests.

## Documentation

`docs/payments.md` (Stripe setup, webhook configuration, Stripe CLI local development, test cards),
`.env.example`, Insomnia collection folder, README, CHANGELOG. ROADMAP gains the future item:
product `sku` field + snapshot inclusion.
