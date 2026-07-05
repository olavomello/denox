# User Management — Implementation Plan

1. `user.model.ts` — entity shapes (no behavior).
2. `user.dto.ts` — validation of untrusted input, per-field error details.
3. `user.repository.ts` — `UserRepository` interface + in-memory implementation.
4. `user.service.ts` — business rules with constructor-injected repository.
5. `user.controller.ts` — HTTP adapter; throws, never builds error responses.
6. `user.routes.ts` — composition root; register in `src/api/main.ts`.
7. Tests — unit (dto, service w/ mock), integration (pipeline), e2e (socket).
8. Docs — `docs/user-management.md`; update CHANGELOG.

Definition of done: `deno task ci` green; spec acceptance criteria all covered by at least one test.
