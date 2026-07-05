/**
 * Unit tests — contact DTO validation (src/api/contact/contact.dto.ts).
 */

import { assertEquals, assertThrows } from "@std/assert";
import { parseCreateContactDto } from "@/api/contact/contact.dto.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";

Deno.test("parseCreateContactDto trims and normalizes valid input", () => {
  const dto = parseCreateContactDto({
    name: "  Ada  ",
    email: "ADA@Example.COM ",
    message: " Hello there ",
  });
  assertEquals(dto, { name: "Ada", email: "ada@example.com", message: "Hello there" });
});

Deno.test("parseCreateContactDto rejects non-object bodies", () => {
  assertThrows(() => parseCreateContactDto(null), ValidationException);
  assertThrows(() => parseCreateContactDto("text"), ValidationException);
});

Deno.test("parseCreateContactDto collects per-field errors", () => {
  const error = assertThrows(
    () => parseCreateContactDto({ name: "A", email: "nope", message: "" }),
    ValidationException,
  );
  const fields = error.details?.fields as Record<string, string>;
  assertEquals(typeof fields.name, "string");
  assertEquals(typeof fields.email, "string");
  assertEquals(typeof fields.message, "string");
});

Deno.test("parseCreateContactDto enforces the message length ceiling", () => {
  assertThrows(
    () =>
      parseCreateContactDto({
        name: "Ada",
        email: "ada@example.com",
        message: "x".repeat(2001),
      }),
    ValidationException,
  );
});
