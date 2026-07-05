# Form Interaction (Frontend ↔ API)

Zero-build progressive enhancement: HTML forms submit to the JSON API and render the result without
navigation — scroll, focus and page state stay intact. Without JavaScript, forms fall back to their
native `action`.

## Usage

```html
<form data-api="/api/contact" data-target="#ok" data-reset="true"
  action="/contact" method="post">
  <input name="email" required>
  <span data-error-for="email"></span>
  <button type="submit">Send</button>
</form>
<template id="ok">
  <p class="success">Thanks!</p>
</template>
```

| Attribute        | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `data-api`       | Opts the form in; endpoint receiving the JSON payload.          |
| `data-method`    | HTTP method (default `POST`).                                   |
| `data-target`    | `<template>` selector rendered on success.                      |
| `data-reset`     | `"true"` resets the fields on success.                          |
| `data-error-for` | Slot for a field's validation message (auto-created if absent). |

## Behavior

- `FormData` is serialized to JSON (input `name` == DTO field name).
- `VALIDATION_ERROR` envelopes paint `error.details.fields` into the matching `[data-error-for]`
  slots (via `textContent` — injection safe) and mark inputs `aria-invalid`; other errors land in
  the form-level slot.
- While pending: submit disabled + `aria-busy` (double-submit safe).
- Events `denox:success` / `denox:error` bubble with the envelope in `detail`; call
  `event.preventDefault()` to take over rendering.

## No-JS fallback

Keep a native `action`; the reference `/contact` route validates through the same DTO/service and
answers with Post-Redirect-Get (`303 → /contact?sent=1` or `?error=1`).

## Reference implementation

Page `src/frontend/pages/contact/main.ts` + API slice `src/api/contact/` (`POST /api/contact`,
in-memory store until 0.3 persistence).
