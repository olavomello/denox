# Form Interaction — Implementation Plan

1. Contact slice: model → dto → repository (interface + in-memory) → service → controller → routes
   (exporting the shared service singleton); register in `src/api/main.ts`.
2. `public/assets/js/denox-form.js` helper (delegation, envelope handling, a11y attributes,
   cancelable events).
3. Layout: load helper module; contact page: `data-api` convention + success template + error
   slots + query-flag notes; fix stale About-page doc comments.
4. No-JS fallback: `POST /contact` (PRG) in the frontend router.
5. Tests: unit (dto matrix, service w/ mock), integration (API envelope, page markup, PRG), e2e
   (socket submission).
6. Docs (`docs/form-interaction.md`), CHANGELOG 0.2.3, VERSION, README What's New + feature bullet.

Definition of done: `deno task ci` green; spec acceptance criteria covered.
