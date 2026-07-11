/**
 * User DTOs and validation.
 *
 * Parses untrusted input (`unknown`) into typed DTOs at the boundary.
 * Throws {@link ValidationException} with per-field details on failure, so
 * the rest of the application only ever sees valid, typed data.
 */

import { ValidationException } from "@/shared/exceptions/app_exception.ts";
import type { NewUser } from "@/api/users/user.model.ts";

/** Profile fields accepted from clients (credentials come from auth). */
export type CreateUserDto = Pick<NewUser, "name" | "email">;

/** Profile fields accepted from clients (credentials come from auth). */
export type UserProfileInput = Pick<NewUser, "name" | "email">;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and normalizes the create-user payload.
 *
 * @param input Untrusted request body.
 * @returns Typed, trimmed DTO.
 * @throws {ValidationException} When any field is invalid.
 */
export function parseCreateUserDto(input: unknown): CreateUserDto {
  const fields: Record<string, string> = {};

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be a JSON object");
  }

  const body = input as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    fields.name = `name must be a string with ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters`;
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    fields.email = "email must be a valid email address";
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid user payload", { fields });
  }

  return { name, email };
}
