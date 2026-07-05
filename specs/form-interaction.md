---
feature: form-interaction
status: approved
author: olavomello
reviewed_by: olavomello
date: 2026-07-05
---

# Form Interaction (Frontend ↔ API) — Specification

## Objective

Provide a zero-build, zero-dependency convention for HTML forms to submit data to the JSON API and
render the result **without losing page state** (no full reload; scroll, focus and unrelated inputs
preserved). The existing JSON API remains the single source of truth — no parallel HTML-fragment
endpoints.

Reference use case: the `/contact` page form (currently posting to a non-existent `POST /contact`
route) becomes the first consumer, backed by a new `contact` API feature slice.

## Scope

### In scope

- `public/assets/js/denox-form.js`: a small (~2 KB, vanilla ES module) progressive-enhancement
  helper, served by the existing static layer and loaded by the default layout with `defer`.
- Declarative convention via `data-*` attributes on `<form>`.
- Automatic per-field validation errors from the standard error envelope.
- Success rendering via `<template>` target and/or DOM events.
- New API feature slice `src/api/contact/` (model, DTO, repository interface + in-memory impl,
  service, controller, routes) following the reference slice.
- Update `/contact` page to the convention (keeping a no-JS fallback).

### Out of scope

- SPA routing, hydration, client-side state management.
- File upload handling (multipart) — future spec.
- Sending contact messages by email/webhook (repository stores them; transport adapters arrive with
  persistence work in 0.3+).

## Convention (developer-facing API)

```html
<form
  data-api="/api/contact" <!-- required: enables the helper -->
  data-method="POST"             <!-- optional, default POST -->
  data-target="#contact-ok"      <!-- optional: <template> rendered on success -->
  data-reset="true"              <!-- optional: reset fields on success -->
  action="/contact" method="post"  <!-- no-JS fallback preserved -->
>
  <input name="name">
  <span data-error-for="name"></span>
  ...
  <button type="submit">Send</button>
</form>

<template id="contact-ok">
  <p class="success">Thanks! We received your message.</p>
</template>
```

Behavior contract:

1. Helper intercepts `submit` only on forms with `data-api` (`preventDefault`); all other forms are
   untouched.
2. Serializes `FormData` → JSON object; sends `fetch` with `content-type: application/json` and
   `accept: application/json`.
3. While pending: submit button disabled and `aria-busy="true"` on the form.
4. On `{ success: false, error }`:
   - `VALIDATION_ERROR`: each `error.details.fields[name]` message is written into the matching
     `[data-error-for="name"]` element (created after the input when absent); inputs receive
     `aria-invalid="true"`. DTO field names == input `name` attributes (convention over
     configuration).
   - Other codes: `error.message` rendered in a form-level `[data-error-for="form"]` element
     (created before the submit button when absent).
5. On `{ success: true, data }`:
   - Previous error marks are cleared.
   - If `data-target` points to a `<template>`, its content replaces the form's success slot
     (`[data-success]` inside the form, or is inserted after the form).
   - `data-reset="true"` resets the fields.
6. Events (both bubble, `detail` carries the envelope):
   - `denox:success` — after success handling.
   - `denox:error` — after error handling. Developers can `preventDefault()` on them to take over
     rendering.
7. No page navigation ever occurs when the helper is active; without JS the form falls back to its
   native `action`.

## Functional Requirements

- FR-1: Forms without `data-api` keep native behavior (helper is opt-in).
- FR-2: `POST /api/contact` validates name (2–100), email (RFC-like, ≤254, trimmed/lowercased) and
  message (2–2000) via a DTO parser, returning the standard envelopes (201 / 400 `VALIDATION_ERROR`
  with per-field details).
- FR-3: Contact messages persist through a `ContactRepository` interface with an in-memory default
  implementation (swap-in ready for 0.3 persistence).
- FR-4: Field errors map by input `name`; unknown field errors fall back to the form-level error
  element.
- FR-5: Double-submit is prevented while a request is in flight.
- FR-6: The `/contact` page uses the convention and works with JS disabled (native POST answered by
  a minimal `POST /contact` frontend route that proxies to the service and re-renders the page with
  a success/error note).

## Non Functional Requirements

- NFR-1: Zero new dependencies; no build step; helper is plain ES2020.
- NFR-2: Helper ≤ ~2 KB unminified logic (excluding comments).
- NFR-3: No breaking changes: pages, layouts and existing tests unchanged; helper script loaded with
  `defer` and inert on pages without opt-in forms.
- NFR-4: Accessibility: `aria-busy`, `aria-invalid`, `role="alert"`/`aria-live="polite"` on
  error/success containers.
- NFR-5: All server-rendered dynamic values escaped; helper writes messages via `textContent` (never
  `innerHTML` for API-provided strings).

## Acceptance Criteria

- AC-1: Submitting valid data on `/contact` renders the success template, fires `denox:success`, and
  the page does not navigate.
- AC-2: Submitting `name: "A"` + invalid email shows both field messages next to their inputs and
  fires `denox:error`.
- AC-3: `POST /api/contact` returns 201 with the stored message (id, createdAt) in the success
  envelope.
- AC-4: With JS disabled, the native POST to `/contact` returns a rendered page confirming the
  submission (no 404).
- AC-5: Existing test suite remains green.

## Security Considerations

- API messages rendered with `textContent` (no injection surface).
- Existing global protections apply unchanged: CSRF origin check (JSON same-origin submits pass;
  cross-origin blocked by CORS), rate limit on `/api/*`, body size limit (message capped at 2000
  chars well below it).
- The no-JS `POST /contact` route validates through the same DTO/service.

## Performance Considerations

- Single small static script, cached by the existing static cache headers; no framework runtime
  shipped.
- One event listener via delegation on `document` (no per-form listeners).

## Tests

- Unit: contact DTO validation matrix; ContactService with mock repository; helper's pure functions
  (FormData→JSON mapping, field-error distribution) extracted to testable form if needed.
- Integration: `POST /api/contact` happy path, per-field 400, envelope shape; `GET /contact`
  contains `data-api` form and the helper script tag; no-JS `POST /contact` renders confirmation.
- E2E: contact submission over a real socket (API path).
