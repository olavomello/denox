---
feature: payments-lifecycle
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-13
---

# Payments Lifecycle — Specification (0.9.x)

## Objective

Make the payment lifecycle honest. Since 0.7 the model has carried three **reserved** statuses —
`processing`, `cancelled`, `refunded` — that no event ever produces: a promise the code does not
keep. This cycle gives each of them a producing path, adds **refunds** (the missing operation every
real store needs), and records **why** a payment reached its current state, so a refunded charge is
not a black box.

## Scope

### In scope

**1. Refunds — `POST /api/payments/{id}/refund`** (admin)

- Full by default; partial with `{ amountCents }` (validated: 1 ≤ amount ≤ remaining refundable);
- calls Stripe's REST refunds endpoint (plain `fetch`, form-urlencoded, the 0.7 pattern — still no
  SDK), keyed on the payment's charge/intent;
- optional `{ reason }` (`duplicate` | `fraudulent` | `requested_by_customer`);
- **idempotent by design**: refunding an already fully refunded payment returns 409, never a double
  refund;
- only `paid` payments are refundable (409 otherwise).

**2. Statuses gain producing events** — the reserved three, plus one:

| Status                     | Produced by                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `processing`               | `payment_intent.processing` (async methods: bank debits)                                                                            |
| `cancelled`                | `checkout.session.expired` where the session was abandoned before payment (today everything expires) — kept distinct from `expired` |
| `refunded`                 | `charge.refunded` (full) — also set synchronously by our own refund call                                                            |
| `partially_refunded` (new) | `charge.refunded` where `amount_refunded < amount`                                                                                  |

`refundedCents` is tracked on the payment (0 by default) so partial refunds accumulate correctly.

**3. Transition history — the audit trail**

Each payment carries `transitions: [{ from, to, at, source, eventId?,
actorId? }]` — appended on
every status change, whether it came from a webhook (`source: "webhook"`, with the provider event
id) or an admin action (`source: "admin"`, with the user id). This is what turns "why is this
refunded?" into a question with an answer.

**4. Ledger + guards**

- The existing 24h event ledger keeps webhooks idempotent; refunds add a status guard (`paid` →
  refundable) plus an amount guard;
- illegal transitions are rejected in the service (e.g. `pending` → `refunded` cannot happen), so a
  malformed/hostile event cannot corrupt a record.

**5. Contract & docs**

OpenAPI description for the refund endpoint (+ the new status enum values and
`refundedCents`/`transitions` on the Payment schema), Insomnia regenerated, `docs/payments.md`
refund section, AGENTS.md untouched (no workflow change).

### Out of scope

Refund UI (admin panel is not a thing yet), disputes/chargebacks (`charge.dispute.*` — a separate
cycle: they need evidence submission), automatic reconciliation crons, payouts, multi-currency
refunds, partial-refund proration of application fees.

## Functional Requirements

- FR-1: refunding a `paid` payment fully sets `refunded`, records `refundedCents === amountCents`,
  appends an `admin`-sourced transition and returns the updated payment.
- FR-2: partial refund sets `partially_refunded` and accumulates `refundedCents`; a second partial
  refund that reaches the total sets `refunded`.
- FR-3: refunding a non-`paid` payment → 409; over-refunding (amount > remaining) → 400; non-admin
  → 403.
- FR-4: `charge.refunded` webhooks reach the same statuses idempotently (a refund initiated by us
  and its subsequent webhook do not double-count `refundedCents`).
- FR-5: `payment_intent.processing` sets `processing`; a later `checkout.session.completed` still
  moves it to `paid`.
- FR-6: illegal transitions (e.g. `pending` → `refunded`) are rejected and leave the record
  untouched.
- FR-7: every status change appends exactly one transition entry with its source; the history
  survives KV round trips.

## Non Functional Requirements

- NFR-1: no SDK, no new dependencies (fetch + Web Crypto, as in 0.7).
- NFR-2: the suite stays green without a Stripe account (MockProvider gains `refund()`; the REST
  shape is asserted against a local mock server, as with checkout).
- NFR-3: provider-agnostic — `refund()` joins the `PaymentProvider` interface, so a future provider
  implements it without touching the service.

## Security Considerations

Refunds move money: admin-only (`requireRole("admin")`), amount validated server-side against the
stored payment (never trusting the client), and every refund is attributable through the
transition's `actorId`. Webhook signature verification is unchanged; the status guard means a forged
`charge.refunded` for a `pending` payment is rejected rather than corrupting the record.

## Tests

Unit: refund DTO (amount/reason validation), transition builder, illegal transition matrix,
`mapEventStatus` for the new events. Integration: FR matrix on a composed app with MockProvider
(full/partial/double refund, non-paid 409, over-refund 400, non-admin 403, webhook idempotency,
processing → paid), plus a Stripe-REST shape test against a local mock server. Estimated +12–15
tests.

## Documentation

`docs/payments.md` (refunds + the status table with producing events),
`docs/architecture/payments-lifecycle.md`, plan, OpenAPI/Insomnia regeneration, CHANGELOG, ROADMAP
(payments follow-ups checked off; the stale SKU line removed).
