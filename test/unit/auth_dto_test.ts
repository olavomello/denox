/**
 * Unit tests — auth DTO validation.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { parseLoginDto, parseSignupDto } from "@/api/auth/auth.dto.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";

Deno.test("parseSignupDto normalizes and validates fields", () => {
  const dto = parseSignupDto({
    name: "  Grace Hopper ",
    email: "Grace@Example.COM",
    password: "compilers-rule",
  });
  assertEquals(dto.name, "Grace Hopper");
  assertEquals(dto.email, "grace@example.com");
});

Deno.test("parseSignupDto collects per-field errors", () => {
  const error = assertThrows(
    () => parseSignupDto({ name: "G", email: "nope", password: "short" }),
    ValidationException,
  );
  const fields = (error.details as { fields: Record<string, string> }).fields;
  assertEquals(typeof fields.name, "string");
  assertEquals(typeof fields.email, "string");
  assertEquals(typeof fields.password, "string");
});

Deno.test("parseLoginDto requires a valid email and a password", () => {
  assertThrows(() => parseLoginDto({ email: "x", password: "" }), ValidationException);
  const dto = parseLoginDto({ email: "a@b.co", password: "p" });
  assertEquals(dto.email, "a@b.co");
});
