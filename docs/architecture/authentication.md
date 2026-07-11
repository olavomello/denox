# Authentication — Architecture

```
src/shared/password.ts          PBKDF2 hashing (self-describing, const-time)
src/api/auth/session.store.ts   SessionStore: memory + KV (expireIn TTL)
src/api/auth/auth.dto.ts        signup/login boundary validation
src/api/auth/auth.service.ts    rules: roles, generic errors, timing equal.
src/api/auth/auth.controller.ts cookie ownership + public serialization
src/api/auth/auth.singletons.ts shared instances (no import cycles)
src/api/users/user.singletons.ts  repository/service singletons
src/middleware/auth.ts          requireAuth / requireRole / originCheck
```

## Decisions

- **Server-side sessions over JWT**: revocation is real (logout kills the record; replay fails), KV
  `expireIn` cleans up, and no signing secrets to manage — id entropy (128-bit CSPRNG) is the
  credential.
- **Singleton modules** break the cycle routes → middleware → auth → users: middleware depends on
  `auth.singletons`, never on route files.
- **Public serialization at one boundary**: `toPublicUser()` is the only path from User to a
  response; a test greps responses for `passwordHash`.
- **First-user-is-admin**: scaffold convention; the check reads the user count at signup (a
  concurrent double-first race is acceptable for a scaffold and documented).
- **originCheck on the API router**: cookie-authenticated mutations with a cross-origin Origin
  header → 403; requests without Origin (curl, tests) pass. Complements SameSite=Lax.
- Removal of `POST /api/users`: one creation path, always credentialed.
