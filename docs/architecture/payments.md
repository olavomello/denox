# Payments — Architecture

```
src/api/payments/provider.ts        PaymentProvider + Stripe (REST/WebCrypto) + Mock
src/api/payments/payment.model.ts   Payment, statuses (incl. reserved), snapshot
src/api/payments/payment.dto.ts     checkout validation (product xor custom)
src/api/payments/payment.repository(.kv).ts  repos + EventLedger (KV TTL)
src/api/payments/payment.service.ts checkout + idempotent webhook lifecycle
src/api/payments/payment.controller.ts  raw-body webhook adapter
src/api/payments/payment.routes.ts  composition; 501 mode when provider none
```

## Decisions

- **No Stripe SDK**: two operations (create session, verify webhook) over plain REST + Web Crypto —
  zero supply-chain surface on code holding payment secrets, guaranteed Deploy compatibility.
  Refunds/subscriptions later may revisit; the interface isolates that decision.
- **Server-side pricing**: product mode ignores client amounts entirely (DTO makes the modes
  exclusive) and snapshots the product.
- **Idempotency** via EventLedger (KV `expireIn` 24 h) checked before any transition; unknown
  provider ids answer 200 (no validity oracle).
- **501-off mode**: routes always registered; `provider: "none"` keeps deployments inert with no
  keys demanded; enabling stripe fail-fasts.
- **Money in integer cents**; provider injectable (mock lifecycle tests, STRIPE_API_BASE for
  REST-shape tests against a local server).
