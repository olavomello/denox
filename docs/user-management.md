# User Management

## Overview

Reference MVC feature slice: JSON API to list, fetch and create users.

## API

| Method | Path             | Success  | Errors                                                                          |
| ------ | ---------------- | -------- | ------------------------------------------------------------------------------- |
| GET    | `/api/users`     | 200 list | —                                                                               |
| GET    | `/api/users/:id` | 200 user | 404 `NOT_FOUND`                                                                 |
| POST   | `/api/users`     | 201 user | 400 `BAD_REQUEST` / `VALIDATION_ERROR`, 409 `CONFLICT`, 429 `TOO_MANY_REQUESTS` |

### Create — request

```json
{ "name": "Grace Hopper", "email": "grace@example.com" }
```

### Create — responses

```json
{
  "success": true,
  "data": { "id": "…", "name": "Grace Hopper", "email": "grace@example.com", "createdAt": "…" }
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid user payload",
    "details": { "fields": { "email": "email must be a valid email address" } }
  }
}
```

## Errors

All errors use the standard envelope produced by `middleware/error_handler.ts`. Stack traces are
never exposed.

## Security

Untrusted input parsed as `unknown` and validated at the boundary; global rate limiting and body
limits apply; duplicate detection prevents account spraying noise in the store.

## Performance

O(1) id lookups; email lookup O(n) in memory (indexed in the future DB adapter).
