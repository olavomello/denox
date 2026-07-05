---
feature: user-management
status: approved
author: claude (scaffold)
reviewed_by: olavomello
date: 2026-07-05
---

# User Management — Specification

## Objective

Provide a JSON API to list, fetch and create users, serving as the reference implementation of the
DenoX MVC feature slice (model → DTO → repository → service → controller → routes).

## Scope

### In scope

- `GET /api/users` — list users.
- `GET /api/users/:id` — fetch one user.
- `POST /api/users` — create a user (name, email).
- In-memory persistence behind a repository interface.

### Out of scope

- Authentication/authorization.
- Update and delete operations.
- Database persistence (see ROADMAP 0.3).

## Functional Requirements

- FR-1: Listing returns every stored user in the standard success envelope.
- FR-2: Fetching an unknown id returns 404 with code `NOT_FOUND`.
- FR-3: Creation validates name (2–100 chars) and email (RFC-like format, ≤254 chars), trimming and
  lowercasing the email.
- FR-4: Creation rejects duplicate emails with 409 `CONFLICT`.
- FR-5: Invalid payloads return 400 `VALIDATION_ERROR` with per-field details.

## Non Functional Requirements

- NFR-1: No HTTP concepts inside the service layer.
- NFR-2: Repository accessed only through its interface (swap-in ready).
- NFR-3: All failures flow through the centralized error handler.

## Acceptance Criteria

- AC-1: Given a valid payload, when POSTing to `/api/users`, then the response is 201 with the
  created user (id, createdAt generated).
- AC-2: Given an already-registered email, when POSTing again, then 409.
- AC-3: Given `name: "A"` and an invalid email, then 400 with both field errors.
- AC-4: Given an unknown id, when GETting `/api/users/:id`, then 404.

## Security Considerations

- Body parsed as `unknown` and validated before use.
- Malformed JSON returns 400 `BAD_REQUEST` (no stack trace).
- Endpoint covered by the global rate limiter and body size limit.

## Performance Considerations

- In-memory Map operations are O(1) for id lookup; email lookup is O(n), acceptable for the scaffold
  and replaced by an index in the DB adapter.

## Tests

- Unit: DTO validation matrix; service rules with a mocked repository.
- Integration: full pipeline via `app.request()` for every acceptance criterion.
- E2E: creation over a real socket.
