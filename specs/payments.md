---
feature: payments
status: draft
author: olavomello
reviewed_by:
date: 2026-07-11
---

# Payments — Specification (0.7)

## Objective

Give DenoX a complete payment capability behind a provider interface — **Stripe first**, others
later — where the app requests a payment (checkout) and receives status updates **automatically via
webhooks**, optionally linked to the authenticated user and to a product. Built on Stripe's plain
HTTPS REST API + Web Crypto signature verification: **zero new dependencies** (no Stripe SDK).

## Scope

### In scope

**1. Provider interface — `src/api/payments/provider.ts`**

```ts
interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<ProviderCheckout>; // {providerId, url}
  parseWebhook(rawBody: string, signature: string): Promise<ProviderEvent>; // verified
}
```

- **`StripeProvider`**: Checkout Sessions via `fetch` (form-encoded REST — the official SDK is
  unnecessary weight); webhook verification implements Stripe's scheme natively (HMAC-SHA256 over
  `t.payload` via Web Crypto, constant-time compare, 5-minute timestamp tolerance against replay).
- **`MockProvider`** (tests/dev without keys): deterministic ids, helper to forge signed events.
- Provider selected by config `payments.provider: "none" | "stripe"` (default **none** — routes
  answer 501 and no keys are required; `stripe` makes `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`
  fail-fast required in env.ts).

**2. Payment slice — `src/api/payments/`** (model, dto, repository memory+KV, service, controller,
routes)

- `Payment { id, provider, providerId, status, amountCents, currency,
  productId?, userId, createdAt, updatedAt }`;
  `status: "pending" | "paid" | "failed" | "expired"`.
- KV secondary index `["payments_by_provider_id", providerId]` for O(1) webhook resolution.

**3. Endpoints**

- `POST /api/payments/checkout` (**requireAuth** — payment linked to the session user): body
  `{ productId }` **or** `{ amountCents, currency,
  description }`. With `productId`, the amount
  comes from the server-side product lookup — **client-sent amounts are ignored in that mode**
  (price tampering closed by design). Creates the provider checkout, persists a `pending` Payment,
  returns `{ paymentId, url }` (redirect target — Stripe hosts the payment page).
- `POST /api/payments/webhook` (public, **signature-verified on the raw body** before any parsing):
  maps provider events (`checkout.session.completed` → paid, `...async_payment_failed` → failed,
  `...expired` → expired), updates the Payment, replies 200. **Idempotent**: processed provider
  event ids are recorded (KV `expireIn` 24 h) and replays are acknowledged without side effects.
  Unknown providerId → 200 + structured warning (never leak validity).
- `GET /api/payments/:id` — owner or admin; `GET /api/payments` — admin.
- Success/cancel redirect targets: `payments.successPath` / `payments.cancelPath` config (default
  `/`), appended with `?payment=<id>` — dedicated result pages are out of scope (Stripe hosts
  checkout).

**4. Config & env** — `payments` section
`{ provider: "none", currency: "usd", successPath: "/", cancelPath: "/" }`; env keys above plus
optional `STRIPE_API_BASE` (test/proxy override — also what lets integration tests point the real
provider at a local mock server).

### Out of scope

Subscriptions/recurring, refunds/disputes API, multi-item carts, saved payment methods,
checkout/result UI pages, additional providers (interface ready), payouts, tax/invoicing.

## Functional Requirements

- FR-1: provider `none` → payment routes answer 501 (mechanism present, feature off; no env keys
  demanded).
- FR-2: checkout with `productId` uses the stored price; body amounts are ignored in that mode
  (asserted).
- FR-3: checkout without auth → 401; response carries `paymentId` + `url`; a `pending` Payment
  exists linked to the user.
- FR-4: webhook with a valid signature flips pending → paid (or failed/expired per event); the
  Payment records `updatedAt`.
- FR-5: invalid signature, tampered payload or stale timestamp → 400; no state change.
- FR-6: replayed event id → 200, no double transition (idempotency).
- FR-7: `GET /api/payments/:id` — 200 owner, 200 admin, 403 other user, 401 anonymous.
- FR-8: payments persist across restart on the KV driver (e2e).

## Non Functional Requirements

- NFR-1: zero dependencies (fetch + Web Crypto).
- NFR-2: raw-body signature verification happens before JSON parsing and before any lookup.
- NFR-3: secrets never logged (logger assertion in tests); amounts stored in integer cents (no float
  money).
- NFR-4: full suite runs green with no Stripe account (mock provider + local HTTPS-less mock server
  via `STRIPE_API_BASE`).

## Security Considerations

Signature scheme per Stripe docs with constant-time comparison and timestamp tolerance; idempotency
ledger; server-side pricing; webhook route exempt from nothing except its own verification
(originCheck ignores cookie-less requests by design); 501-by-default keeps unconfigured deployments
inert; keys via env only, fail-fast when the provider demands them.

## Tests

Unit: signature verification vectors (valid/tampered/stale), DTO matrix, status mapping.
Integration: FR matrix with MockProvider + StripeProvider against a local mock API server (checkout
form encoding, webhook lifecycle, idempotency, authorization matrix). E2E: KV persistence of a
payment across restart. Estimated +20–25 tests.

## Documentation

`docs/payments.md` (Stripe setup: keys, webhook endpoint registration, test cards, local testing
with the Stripe CLI), Insomnia folder **Payments**, `.env.example`, CHANGELOG, README feature line
on release.
