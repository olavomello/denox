# Payments Lifecycle — Implementation Plan

1. Model: full status set (+`partially_refunded`), `PaymentTransition`, `LEGAL_TRANSITIONS` +
   `canTransition`, `refundedCents`/`transitions` on Payment (excluded from `NewPayment` —
   repositories initialize them).
2. Repositories: `applyTransition(id, StatusChange)` replaces `updateStatus`, both delegating to the
   shared `withTransition` builder.
3. Provider: `refund()` on the interface; Stripe implementation (session → payment_intent →
   `/v1/refunds`, form-urlencoded); MockProvider echo.
4. Service: new event mappings, `refundStatus`, guarded `applyWebhook` (refund-aware, delta-based),
   `refund()` with status/amount validation and admin attribution.
5. HTTP: `POST /api/payments/:id/refund` behind `requireRole("admin")`, `parseRefundDto`, colocated
   OpenAPI description + schema updates, Insomnia regenerated.
6. Tests: unit (state machine, refund status, mapping, audit builder, DTO) + integration FR matrix
   (full/partial/guards/idempotency/processing/illegal/ audit) + Stripe REST shape against a local
   mock server. 194 total.
7. Docs: payments (refunds, lifecycle table, audit trail), architecture, plan, CHANGELOG, ROADMAP.
