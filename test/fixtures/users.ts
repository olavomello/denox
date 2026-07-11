/**
 * User test fixtures — deterministic data shared across test layers.
 */

import type { User } from "@/api/users/user.model.ts";

/** Two well-known users for read scenarios. */
export const userFixtures: readonly User[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ada Lovelace",
    email: "ada@example.com",
    passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
    role: "user",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Alan Turing",
    email: "alan@example.com",
    passwordHash: "pbkdf2:sha256:1000:c2FsdA==:aGFzaA==",
    role: "user",
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

/** A valid payload for `POST /api/users`. */
export const validCreateUserPayload = {
  name: "Grace Hopper",
  email: "grace@example.com",
} as const;
