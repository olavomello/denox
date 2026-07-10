---
feature: authentication
status: draft
author: claude
reviewed_by:
date: 2026-07-10
---

# Authentication, Sessions & Authorization — Specification (0.5)

## Objective

Give DenoX a complete, production-shaped authentication layer on top of the existing users API,
following the three-part architecture of the Next.js authentication guide
(https://nextjs.org/docs/app/guides/authentication): **authentication** (verify identity), **session
management** (track state across requests) and **authorization** (decide what a user may do) — with
zero new dependencies, both storage drivers supported, and the framework's progressive-enhancement
form layer powering the UI.

## Scope

### In scope

**1. Authentication — `src/api/auth/` feature slice**

- `POST /api/auth/signup` `{name, email, password}` → creates the user (hashing the password),
  starts a session, 201 with the public user.
- `POST /api/auth/login` `{email, password}` → verifies credentials, starts a session, 200 with the
  public user. Invalid email and invalid password return the same generic 401 (no user enumeration).
- `POST /api/auth/logout` → destroys the current session (204).
- `GET /api/auth/me` → current public user, or 401.
- **Password hashing with native Web Crypto** (zero-dependency principle): PBKDF2-HMAC-SHA256, 210
  000 iterations (OWASP baseline), 16-byte random salt per user, constant-time comparison; stored as
  `pbkdf2:sha256:<iter>:<salt>:<hash>` so parameters can evolve.
- User model gains `passwordHash` and `role: "admin" | "user"`. The **first signed-up user becomes
  `admin`** (scaffold convention, documented); subsequent users are `user`.
- **Public serialization boundary**: a `toPublicUser()` mapper strips `passwordHash` from every
  response; a test greps all user-returning endpoints for leakage.
- `POST /api/users` (unauthenticated creation without password) is **removed** — signup owns
  creation now; read endpoints remain. Breaking pre-1.0 change, changelog-flagged. Seed task creates
  a default admin (`admin@denox.dev` / password from `SEED_ADMIN_PASSWORD`, default `denox-admin` —
  dev only, documented).

**2. Session management — KV-backed, driver-aware**

- Server-side sessions (revocable — the decisive advantage over stateless JWT given we already have
  KV): `["sessions", id]` → `{userId, createdAt,
  expiresAt}` with **native KV `expireIn`** for
  automatic cleanup; in-memory Map with expiry-on-read for the memory driver. 7-day fixed expiry.
- Cookie `denox_session`: 128-bit random id, `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` outside
  development. Server-side store makes cookie signing unnecessary (id entropy is the secret).
- Session storage follows the repository pattern (`SessionStore` interface, memory + KV) selected by
  `STORAGE_DRIVER`.

**3. Authorization — middleware**

- `requireAuth`: resolves the session → stashes the user in context; otherwise **401 JSON** under
  `/api`, **302 → /login** for pages.
- `requireRole("admin")`: 403 JSON / HTML error page.
- Applied in this cycle: product mutations (`POST/PATCH/DELETE
  /api/products*`, image
  upload/removal) and `GET /api/users*` become **admin-only** — closing the long-documented "open
  API" caveat. Reads of products, contact form and all public pages stay public.
- **Origin check middleware** for authenticated state-changing API requests (cookie-authenticated
  multipart/forms are CSRF-relevant): mutations with a session cookie must carry a same-origin
  `Origin` header or none (curl) — combined with `SameSite=Lax` this covers the CSRF surface without
  tokens on the JSON API.
- Stricter rate limit bucket on `/api/auth/login` (brute-force): 10 attempts / 15 min per IP,
  configurable via env.

**4. Frontend**

- `/login` and `/signup` pages (default layout) using the existing `data-api` form helper —
  per-field errors, no-JS PRG fallback included by construction; successful auth redirects to `/`.
- Nav (ui config) is static data — session-aware nav (login/logout state) is **out of scope** for
  this cycle (needs per-request partials; tracked as a follow-up).

### Out of scope

- OAuth/social providers, magic links, 2FA.
- Password reset & e-mail verification (require an e-mail sending layer).
- Sliding session renewal, "remember me" durations, concurrent-session management UI.
- Admin dashboard UI (API-level protection only in this cycle).
- Session-aware navigation partials.

## Functional Requirements

- FR-1: signup → 201, sets the cookie, `me` returns the user; duplicate e-mail → 409 (atomic,
  existing index).
- FR-2: login with wrong e-mail or wrong password → identical generic 401; correct → 200 + cookie.
- FR-3: logout → 204, cookie cleared, session revoked in the store (subsequent `me` → 401 even if
  the old cookie is replayed).
- FR-4: password < 8 chars or > 128 → 400 with field detail.
- FR-5: mutating products without a session → 401; with a `user` role session → 403; with `admin` →
  works. Page navigation to a protected page (future use) redirects 302 to `/login`.
- FR-6: first user admin, second user `user` (verified in one flow test).
- FR-7: no endpoint ever returns `passwordHash`.
- FR-8: sessions persist across restart on the KV driver (subprocess e2e) and expire after their
  TTL.
- FR-9: login rate limit returns 429 after the threshold.
- FR-10: authenticated mutation with a cross-origin `Origin` header → 403.

## Non Functional Requirements

- NFR-1: Zero new dependencies (Web Crypto PBKDF2, native KV expireIn).
- NFR-2: Hashing cost server-side ≥ 100 ms target class; login/signup are the only endpoints paying
  it.
- NFR-3: Existing public read behavior unchanged; contact flow untouched.
- NFR-4: Both storage drivers pass the full auth suite.

## Security Considerations

PBKDF2 parameters stored per-hash (future migration path); constant-time hash comparison; generic
auth errors; session ids 128-bit CSPRNG; HttpOnly + SameSite=Lax + Secure cookies; Origin
verification on cookie-authenticated mutations; login brute-force rate limiting; role checks
server-side only; no secrets logged (logger test); seed admin password env-driven and flagged as
dev-only in docs.

## Tests

Unit: hashing (roundtrip, salt uniqueness, tamper detection, legacy-format rejection), DTO matrix,
session store expiry. Integration: full FR matrix above on the wired app (memory driver) + KV
variants for store/roles. E2E: KV subprocess — signup, restart, session survives; logout revokes.
Estimated +25–30 tests.

## Documentation

`docs/authentication.md` (architecture mapped to the Next.js guide, endpoints, protecting your own
routes with `requireAuth`/`requireRole`, seed admin, security notes), Insomnia folder **Auth**
(signup, login — cookie jar note —, me, logout, and a 403 demonstration), guide update (protecting a
slice), CHANGELOG (breaking: `POST /api/users` removed), README feature bullet on release.
