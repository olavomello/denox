/**
 * Unit tests — user DTO validation (src/api/users/user.dto.ts).
 */

import { assertEquals, assertThrows } from "@std/assert";
import { parseCreateUserDto } from "@/api/users/user.dto.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";

Deno.test("parseCreateUserDto trims and normalizes valid input", () => {
  const dto = parseCreateUserDto({ name: "  Ada  ", email: "ADA@Example.COM " });
  assertEquals(dto, { name: "Ada", email: "ada@example.com" });
});

Deno.test("parseCreateUserDto rejects non-object bodies", () => {
  assertThrows(() => parseCreateUserDto(null), ValidationException);
  assertThrows(() => parseCreateUserDto("text"), ValidationException);
  assertThrows(() => parseCreateUserDto([1, 2]), ValidationException);
});

Deno.test("parseCreateUserDto collects per-field errors", () => {
  const error = assertThrows(
    () => parseCreateUserDto({ name: "A", email: "not-an-email" }),
    ValidationException,
  );
  const fields = error.details?.fields as Record<string, string>;
  assertEquals(typeof fields.name, "string");
  assertEquals(typeof fields.email, "string");
});
