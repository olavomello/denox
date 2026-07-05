# User Management — Architecture

## Components

```
user.routes.ts        composition root (wires everything)
  └─ user.controller.ts   HTTP adapter (parse → call → envelope)
        └─ user.service.ts     business rules
              └─ user.repository.ts  UserRepository (interface)
                    └─ InMemoryUserRepository (default impl)
user.dto.ts           boundary validation (unknown → CreateUserDto)
user.model.ts         entities (User, NewUser)
```

## Dependency direction

Controller → Service → Repository **interface**. Concrete classes are chosen only in
`user.routes.ts`. No layer imports upward.

## Flow — `POST /api/users`

1. Global middleware: request logger → security stack → rate limit.
2. `UserController.store` parses JSON as `unknown` (malformed → `BadRequestException`).
3. `parseCreateUserDto` validates/normalizes (invalid → `ValidationException`).
4. `UserService.create` checks email uniqueness (duplicate → `ConflictException`) and persists via
   the repository.
5. Controller returns `201` with the success envelope.
6. Any thrown exception is translated by `middleware/error_handler.ts`.

## Risks

- In-memory store loses data on restart and is per-instance — replaced by a database adapter in
  ROADMAP 0.3 (interface stays stable).
- Email uniqueness check is not atomic under concurrency; the DB adapter must enforce a unique
  index.
