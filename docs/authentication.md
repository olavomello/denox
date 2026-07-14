# Authentication, Sessions & Authorization

DenoX auth follows the three-part architecture of the
[Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication), implemented with
native Deno primitives (zero dependencies):

| Concern            | Next.js guide           | DenoX                                      |
| ------------------ | ----------------------- | ------------------------------------------ |
| Authentication     | credential verification | `src/api/auth/` slice, PBKDF2 (Web Crypto) |
| Session management | cookies + session store | revocable KV sessions, `HttpOnly` cookie   |
| Authorization      | middleware / DAL checks | `requireAuth` / `requireRole` middleware   |

## Endpoints

| Method | Path               | Description                                                                                                   |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/signup` | Create account + session (first **admin**: granted while no admin exists — robust to legacy/pre-auth records) |
| POST   | `/api/auth/login`  | Verify credentials + session (generic 401; rate limited)                                                      |
| POST   | `/api/auth/logout` | Revoke the session (204)                                                                                      |
| GET    | `/api/auth/me`     | Authenticated user (401 otherwise)                                                                            |

Passwords: 8–128 chars, hashed with PBKDF2-HMAC-SHA256 (210k iterations, per-user salt, parameters
stored in the hash for future migration, constant-time compare). Login failures are
indistinguishable (no user enumeration) and timing-equalized.

## Sessions

Server-side and revocable: 128-bit ids in the `denox_session` cookie (`HttpOnly`, `SameSite=Lax`,
`Secure` outside development, 7 days), records in the driver-aware store — Deno KV with native
`expireIn` cleanup in production, in-memory in development. Logout deletes the record: replayed
cookies are useless.

## Protecting your routes

```ts
import { requireAuth, requireRole } from "@/middleware/auth.ts";

app.get("/reports", requireAuth(), controller.index); // any user
app.post("/products", requireRole("admin"), controller.store); // admin only
```

API paths receive JSON envelopes (401/403); page paths redirect to `/login`. The resolved user is
stashed in the context (`c.get("authUser")`).

Protected out of the box: every product mutation (create/update/delete and image upload/removal) and
the users read endpoints require **admin**. Product reads, pages and the contact form stay public.
`POST /api/users` was removed — signup owns creation (breaking, pre-1.0).

## CSRF & brute force

Cookie-authenticated mutations must present a same-origin `Origin` header (or none, for CLI clients)
— combined with `SameSite=Lax` this closes the cross-origin form surface. `/api/auth/login` has its
own rate limit bucket (10/15 min per IP, `LOGIN_RATE_LIMIT_*`).

## Pages & seed

`/login` and `/signup` use the `data-api` form helper (per-field errors, `data-redirect` on success,
no-JS PRG fallback). `deno task seed` creates a dev admin (`admin@denox.dev`, password from
`SEED_ADMIN_PASSWORD`, default `denox-admin` — **development only**).
