/**
 * Contact DTOs and validation. Parses untrusted input at the boundary and
 * throws {@link ValidationException} with per-field details on failure —
 * the same details the form helper maps to `[data-error-for]` slots.
 */

import { ValidationException } from "@/shared/exceptions/app_exception.ts";
import type { NewContactMessage } from "@/api/contact/contact.model.ts";

/** Payload accepted by `POST /api/contact`. */
export type CreateContactDto = NewContactMessage;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN_LENGTH = 2;
const MESSAGE_MAX_LENGTH = 2000;

/**
 * Validates and normalizes the contact payload.
 *
 * @param input Untrusted request body (JSON or parsed form data).
 * @returns Typed, trimmed DTO.
 * @throws {ValidationException} When any field is invalid.
 */
export function parseCreateContactDto(input: unknown): CreateContactDto {
  const fields: Record<string, string> = {};

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be an object");
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

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < MESSAGE_MIN_LENGTH || message.length > MESSAGE_MAX_LENGTH) {
    fields.message =
      `message must be a string with ${MESSAGE_MIN_LENGTH}-${MESSAGE_MAX_LENGTH} characters`;
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid contact payload", { fields });
  }

  return { name, email, message };
}
