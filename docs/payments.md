# Payments

DenoX payments live behind a provider abstraction (`PaymentProvider`) — Stripe first, implemented
over its **plain HTTPS REST API with native `fetch` + Web Crypto** (no SDK, zero dependencies).
Checkout pages are hosted by Stripe: card data never touches your app.

## Enabling

```ts
// denox.config.ts
payments: {
  provider: "stripe",   // default "none" → endpoints answer 501
  currency: "usd",
  successPath: "/",     // gets ?payment=<id> appended
  cancelPath: "/",
}
```

```bash
# .env — fail-fast required once provider is "stripe"
STRIPE_SECRET_KEY=sk_live_...      # or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Endpoints

| Method | Path                     | Auth        | Description               |
| ------ | ------------------------ | ----------- | ------------------------- |
| POST   | `/api/payments/checkout` | user        | Create hosted checkout    |
| POST   | `/api/payments/webhook`  | signature   | Provider status callbacks |
| GET    | `/api/payments/:id`      | owner/admin | Payment details           |
| GET    | `/api/payments`          | admin       | Listing                   |

Checkout body: `{ "productId": "..." }` **or**
`{ "amountCents": 1990, "currency": "brl", "description": "..." }` (exactly one mode). In product
mode the amount comes **exclusively** from the stored price — client amounts are rejected — and the
payment persists a `productSnapshot { id, name, sku?, price }` so purchase history survives product
edits/deletion. Response: `{ paymentId, status, url }` → redirect the buyer to `url`.

## Buying from the product page

With a provider enabled, every product view renders a **Buy now** button — a plain form posting to
`POST /products/<slug>/buy` (zero JavaScript, CSP-clean, PRG pattern): anonymous visitors are
redirected to `/login`; authenticated buyers get a `pending` payment (server-side price + product
snapshot, the exact same `PaymentService.checkout` path as the API) and a 303 to the Stripe-hosted
checkout. With `provider: "none"` neither the button nor the route exists.

## Refunds

Admin-only, over Stripe's REST API (still no SDK):

```bash
# full refund
curl -X POST http://localhost:8000/api/payments/<id>/refund \
  -H 'cookie: denox_session=...' -H 'content-type: application/json' -d '{}'

# partial
curl -X POST http://localhost:8000/api/payments/<id>/refund \
  -H 'cookie: denox_session=...' -H 'content-type: application/json' \
  -d '{"amountCents": 500, "reason": "requested_by_customer"}'
```

Only `paid` (and `partially_refunded`) payments qualify — anything else is a 409. Amounts are
validated **against the stored payment**, never the client: over-refunding is a 400, and refunding
an already fully refunded payment is a 409. Partial refunds accumulate in `refundedCents` until they
reach the total, at which point the status becomes `refunded`.

A refund we issue and the `charge.refunded` webhook Stripe sends afterwards **do not double-count**:
the webhook carries the cumulative refunded amount, so only the delta is ever recorded.

## Status lifecycle

| Status               | Produced by                                                   |
| -------------------- | ------------------------------------------------------------- |
| `pending`            | checkout created                                              |
| `processing`         | `payment_intent.processing` (async methods, e.g. bank debits) |
| `paid`               | `checkout.session.completed`                                  |
| `failed`             | `checkout.session.async_payment_failed`                       |
| `expired`            | `checkout.session.expired`                                    |
| `partially_refunded` | a partial refund (ours or Stripe-side)                        |
| `refunded`           | a full refund (ours or Stripe-side)                           |

Transitions are **guarded**: a signature-valid but out-of-order event (say, `charge.refunded` for a
`pending` payment) is rejected and logged rather than applied — the signature proves the sender, the
guard protects the semantics.

## Audit trail

Every status change appends an entry to `transitions[]`:

```json
{
  "from": "paid",
  "to": "partially_refunded",
  "at": "2026-07-13T18:04:11.000Z",
  "source": "admin",
  "actorId": "<user-id>",
  "refundedCents": 500
}
```

Webhook-sourced entries carry the provider `eventId` instead of an actor. This is what makes "why is
this payment refunded, and who did it?" answerable.

## Webhook setup

1. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   `https://your-app.deno.dev/api/payments/webhook`
2. Events: `checkout.session.completed`, `checkout.session.async_payment_failed`,
   `checkout.session.expired`.
3. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

Signatures are verified on the **raw body** (HMAC-SHA256, constant-time, 5-minute replay tolerance)
before any parsing; processed event ids are remembered for 24 h (KV TTL) so replays are acknowledged
without side effects. Unknown session ids return 200 with a structured warning.

## Local development

```bash
stripe listen --forward-to localhost:8000/api/payments/webhook
stripe trigger checkout.session.completed
```

Test card: `4242 4242 4242 4242`, any future date/CVC. The suite runs green with **no Stripe
account**: MockProvider covers the lifecycle and `STRIPE_API_BASE` points the real provider at a
local mock server.

## Statuses

`pending → paid | failed | expired` (this cycle). `processing`, `cancelled` and `refunded` are
reserved states for future events/refund support.
