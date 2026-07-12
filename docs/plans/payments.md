# Payments — Implementation Plan

1. payments config section + NotImplementedException (501).
2. provider.ts: interfaces, StripeProvider (form-encoded sessions, HMAC verification with
   tolerance), MockProvider, fail-fast factory.
3. Slice: model (reserved statuses, snapshot), DTO (exclusive modes, integer cents), memory+KV repos
   with provider/user indexes, EventLedger, service (server pricing, idempotent webhook), controller
   (raw-body first), routes (501 mode).
4. Wire in api/main; userCookie() test helper.
5. Tests: 6 unit (DTO, mapping, signature vectors) + 5 integration (501, checkout matrix incl.
   tamper rejection, webhook lifecycle with replay + unknown id, authorization matrix, Stripe REST
   shape against a local server) + 2 KV persistence. 13 files → 146 total.
6. Docs (payments, architecture), Insomnia Payments folder, .env.example, ROADMAP future sku item,
   CHANGELOG.
