# Authentication — Implementation Plan

1. shared/password.ts (PBKDF2 + dummy-hash timing equalization); 401/403 exceptions + ErrorCode
   entries.
2. Session store (memory/KV expireIn); user model +passwordHash/role, PublicUser mapper; user/auth
   singleton modules.
3. Auth slice (dto/service/controller/routes) with login rate bucket; originCheck; admin guards on
   products/users; POST /api/users removed.
4. /login and /signup pages; data-redirect in denox-form.js; no-JS PRG fallbacks; seed admin
   (SEED_ADMIN_PASSWORD).
5. Tests: hashing/DTO units, FR-matrix integration (17), e2e reworked to signup + KV session (FR-8).
   Helper adminCookie() for order-independent admin sessions in product suites.
6. Insomnia Auth folder + [ADMIN] markers; docs; .env.example; CHANGELOG (breaking flagged).
