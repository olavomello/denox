/**
 * Unit tests — checkout DTO validation and event status mapping.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { parseCheckoutDto } from "@/api/payments/payment.dto.ts";
import { mapEventStatus } from "@/api/payments/payment.service.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";

Deno.test("parseCheckoutDto: product mode and custom mode are exclusive", () => {
  assertEquals(parseCheckoutDto({ productId: "p1" }).kind, "product");
  assertEquals(parseCheckoutDto({ amountCents: 500 }).kind, "custom");
  assertThrows(() => parseCheckoutDto({}), ValidationException);
  assertThrows(
    () => parseCheckoutDto({ productId: "p1", amountCents: 500 }),
    ValidationException,
  );
});

Deno.test("parseCheckoutDto: custom mode validates money, currency and description", () => {
  const dto = parseCheckoutDto({
    amountCents: 1990,
    currency: "BRL",
    description: "Consulting hour",
    metadata: { order: "42" },
  });
  assertEquals(dto.kind === "custom" && dto.currency, "brl");
  assertThrows(() => parseCheckoutDto({ amountCents: 19.9 }), ValidationException); // float
  assertThrows(() => parseCheckoutDto({ amountCents: -5 }), ValidationException);
  assertThrows(() => parseCheckoutDto({ amountCents: 5, currency: "reais" }), ValidationException);
  assertThrows(
    () => parseCheckoutDto({ amountCents: 5, metadata: { a: 1 } }),
    ValidationException,
  );
});

Deno.test("mapEventStatus maps the three handled events and ignores the rest", () => {
  assertEquals(mapEventStatus("checkout.session.completed"), "paid");
  assertEquals(mapEventStatus("checkout.session.async_payment_failed"), "failed");
  assertEquals(mapEventStatus("checkout.session.expired"), "expired");
  assertEquals(mapEventStatus("charge.refunded"), null); // reserved territory
});
