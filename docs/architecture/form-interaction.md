# Form Interaction — Architecture

## Components

```
public/assets/js/denox-form.js   progressive-enhancement helper (vanilla ES)
src/api/contact/                 reference API slice (model → routes)
src/frontend/main.ts             + POST /contact (no-JS fallback, PRG)
src/frontend/layouts/default.ts  + <script type="module" src=".../denox-form.js">
src/frontend/pages/contact/      form using the data-* convention
```

## Flow — JS enabled

1. Delegated `submit` listener; forms without `data-api` are ignored.
2. `FormData` → JSON → `fetch` (`content-type: application/json`); submit disabled + `aria-busy`
   while pending.
3. Envelope handling: `denox:success` / `denox:error` dispatched first (cancelable —
   `preventDefault()` takes over rendering); default rendering maps `error.details.fields[name]` to
   `[data-error-for=name]` slots (`textContent` only) or renders the `data-target` template on
   success.
4. No navigation; page state fully preserved.

## Flow — no JS

Native `POST /contact` (form-encoded) → same DTO + shared `contactService` → Post-Redirect-Get:
`303 /contact?sent=1` on success, `?error=1` on validation failure (native `required` covers most
field errors client-side).

## Dependency notes

- `contact.routes.ts` exports the composed `contactService` singleton so the no-JS frontend route
  reuses the same store (single in-memory instance); documented deviation from the users/products
  slices.
- Helper passes CSP (`script-src 'self'`, external file, no inline).
- CSRF: JSON same-origin passes the origin check; form-encoded POST /contact passes as same-origin;
  cross-origin blocked as before.

## Risks

- In-memory store is per-instance/ephemeral (accepted until 0.3 persistence).
- Query-flag feedback on the no-JS path loses per-field detail (accepted; native validation covers
  required/format upfront).
