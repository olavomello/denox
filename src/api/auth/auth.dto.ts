/**
 * Auth DTOs — boundary validation for signup and login payloads.
 */

import { ValidationException } from "@/shared/exceptions/app_exception.ts";

const NAME_MIN = 2;
const NAME_MAX = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/** Validated signup payload. */
export interface SignupDto {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

/** Validated login payload. */
export interface LoginDto {
  readonly email: string;
  readonly password: string;
}

/** Asserts the body is a plain object. */
function asObject(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be a JSON object");
  }
  return input as Record<string, unknown>;
}

/**
 * Validates the signup payload.
 *
 * @param input Untrusted request body.
 * @returns Typed DTO.
 * @throws {ValidationException} With per-field details.
 */
export function parseSignupDto(input: unknown): SignupDto {
  const body = asObject(input);
  const fields: Record<string, string> = {};

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    fields.name = `name must be between ${NAME_MIN} and ${NAME_MAX} characters`;
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) {
    fields.email = "email must be a valid e-mail address";
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    fields.password = `password must be between ${PASSWORD_MIN} and ${PASSWORD_MAX} characters`;
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid signup payload", { fields });
  }
  return { name, email, password };
}

/**
 * Validates the login payload.
 *
 * @param input Untrusted request body.
 * @returns Typed DTO.
 * @throws {ValidationException} With per-field details.
 */
export function parseLoginDto(input: unknown): LoginDto {
  const body = asObject(input);
  const fields: Record<string, string> = {};

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) {
    fields.email = "email must be a valid e-mail address";
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length === 0) {
    fields.password = "password is required";
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid login payload", { fields });
  }
  return { email, password };
}
