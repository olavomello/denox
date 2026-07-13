---
feature: product-buy-button
status: draft
author: olavomello
reviewed_by:
date: 2026-07-12
---

# Product Buy Button — Specification (0.8.x)

## Objective

Let a visitor buy a product directly from its page: a **Buy now** button on the product view that
creates a Stripe-hosted checkout and redirects the browser to it — rendered **only when
`payments.provider` is not `"none"`**, with zero JavaScript (plain form + PRG, the contact/login
pattern: CSP-clean, works without JS, nothing new to load).

## Scope

### In scope

1. **Payments singletons module** — `src/api/payments/payment.singletons.ts` exporting
   `paymentProvider` (null when `"none"`) and `paymentService` (null when disabled), following the
   users/auth singletons pattern; `payment.routes.ts` consumes it instead of building instances
   inline. This is the seam that lets the frontend reach the service.
2. **Buy flow — web PRG route** `POST /products/:slug/buy` (registered in `frontend/main.ts` **only
   when the service exists**):
   - resolves the session cookie: anonymous → **303 `/login`** (after logging in the user returns
     and buys — session-aware "return-to" is out of scope);
   - authenticated → `paymentService.checkout(userId, { productId })` (server-side price + snapshot,
     exactly the API path) → **303 to the Stripe checkout URL**;
   - unknown slug → 404; provider errors surface as the HTML error page.
   - CSRF: covered by the existing csrf middleware on web routes.
3. **Button on the product view** — rendered by the page **only when
   `site.payments.provider !== "none"`**: a small form
   (`method="post" action="/products/<slug>/buy"`) with a styled button ("Buy now — $49.90", price
   from the product), placed with the product info; scoped styles in the product layout CSS.
4. Docs: frontend section in `docs/payments.md`; CHANGELOG.

### Out of scope

Quantity selection, cart, return-to-product after login, success/cancel result pages (config
redirect paths stay as-is), JS-enhanced inline checkout, button on the showcase cards.

## Functional Requirements

- FR-1: with provider `"none"` (repo default) the product page has **no** buy form and
  `POST /products/:slug/buy` does not exist (404).
- FR-2: with a provider enabled, the page shows the form with the formatted price and the correct
  action URL.
- FR-3: anonymous POST → 303 `/login`; no payment is created.
- FR-4: authenticated POST → a `pending` payment linked to the user with the product snapshot
  exists, and the response is a 303 whose Location is the provider checkout URL.
- FR-5: POST with an unknown slug → 404.

## Non Functional Requirements

- NFR-1: zero JavaScript, zero new dependencies; CSP untouched.
- NFR-2: no behavior change for provider `"none"` deployments.
- NFR-3: the flow reuses `PaymentService.checkout` — one pricing path.

## Tests

Unit: button-fragment helper both branches. Integration (composed app with MockProvider + real
middleware, pattern from payments_test): FR-2..FR-5; wired-app assertion for FR-1. Estimated +5–6
tests.

## Documentation

`docs/payments.md` gains "Buying from the product page"; CHANGELOG entry.
