# Payments Lifecycle — Architecture

```
payment.model.ts       PaymentStatus (8 states) + LEGAL_TRANSITIONS matrix +
                       canTransition() + PaymentTransition (audit entry)
payment.repository.ts  StatusChange + withTransition() — the single builder
                       both drivers use, so the audit trail cannot diverge
payment.service.ts     mapEventStatus (events → status), refundStatus
                       (amount → partial/full), refund() (admin), applyWebhook
                       (guarded, refund-aware, idempotent)
provider.ts            PaymentProvider.refund() — Stripe REST (session →
                       payment_intent → /v1/refunds), MockProvider echo
```

## Decisions

- **No reserved statuses**: every state has a producing path. `charge.refunded` is deliberately
  absent from `mapEventStatus` — refunds carry an amount, so the service decides between
  `partially_refunded` and `refunded`; a status alone cannot express it.
- **The guard is the integrity boundary**: signature verification proves _who_ sent an event;
  `canTransition` decides whether it _makes sense_. A hostile or out-of-order `charge.refunded` on a
  `pending` payment is rejected, not applied.
- **Cumulative vs delta**: Stripe reports the charge's _total_ refunded amount; we store
  `refundedCents` and apply only the difference — which is exactly why a refund we initiate and its
  subsequent webhook cannot double-count (FR-4).
- **One transition builder** (`withTransition`) shared by both drivers: the audit trail is built in
  one place, so memory and KV can never disagree.
- **Money rules live in the service**, never in the DTO: the DTO validates shape (positive integer,
  known reason); the service validates _against the stored payment_ (status, refundable remainder).
