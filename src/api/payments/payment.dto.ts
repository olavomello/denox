/**
 * Payments DTOs — boundary validation for the checkout payload.
 */

import { ValidationException } from "@/shared/exceptions/app_exception.ts";

const CURRENCY_PATTERN = /^[a-z]{3}$/;
const DESCRIPTION_MAX = 200;
const AMOUNT_MAX_CENTS = 100_000_000; // 1M in major units

/** Validated checkout payload: product mode or custom-amount mode. */
export type CheckoutDto =
  | {
    readonly kind: "product";
    readonly productId: string;
    readonly metadata?: Record<string, string>;
  }
  | {
    readonly kind: "custom";
    readonly amountCents: number;
    readonly currency?: string;
    readonly description?: string;
    readonly metadata?: Record<string, string>;
  };

/** Parses optional string-to-string metadata. */
function parseMetadata(
  value: unknown,
  fields: Record<string, string>,
): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fields.metadata = "metadata must be an object of string values";
    return undefined;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.some(([, v]) => typeof v !== "string")) {
    fields.metadata = "metadata values must be strings";
    return undefined;
  }
  if (entries.length > 20) {
    fields.metadata = "metadata is limited to 20 keys";
    return undefined;
  }
  return Object.fromEntries(entries) as Record<string, string>;
}

/**
 * Validates the checkout payload.
 *
 * @param input Untrusted request body.
 * @returns Typed DTO (product xor custom amount).
 * @throws {ValidationException} With per-field details.
 */
export function parseCheckoutDto(input: unknown): CheckoutDto {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be a JSON object");
  }
  const body = input as Record<string, unknown>;
  const fields: Record<string, string> = {};
  const metadata = parseMetadata(body.metadata, fields);

  const hasProduct = body.productId !== undefined;
  const hasAmount = body.amountCents !== undefined;
  if (hasProduct === hasAmount) {
    throw new ValidationException("Provide either productId or amountCents (exactly one)", {
      fields: { productId: "exclusive with amountCents" },
    });
  }

  if (hasProduct) {
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (productId === "") fields.productId = "productId must be a non-empty string";
    if (Object.keys(fields).length > 0) {
      throw new ValidationException("Invalid checkout payload", { fields });
    }
    return { kind: "product", productId, ...(metadata !== undefined ? { metadata } : {}) };
  }

  const amountCents = body.amountCents;
  if (
    typeof amountCents !== "number" || !Number.isInteger(amountCents) ||
    amountCents <= 0 || amountCents > AMOUNT_MAX_CENTS
  ) {
    fields.amountCents = "amountCents must be a positive integer (cents)";
  }
  let currency: string | undefined;
  if (body.currency !== undefined) {
    currency = typeof body.currency === "string" ? body.currency.toLowerCase() : "";
    if (!CURRENCY_PATTERN.test(currency)) {
      fields.currency = "currency must be a 3-letter ISO code";
    }
  }
  let description: string | undefined;
  if (body.description !== undefined) {
    description = typeof body.description === "string" ? body.description.trim() : "";
    if (description === "" || description.length > DESCRIPTION_MAX) {
      fields.description = `description must be 1-${DESCRIPTION_MAX} characters`;
    }
  }
  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid checkout payload", { fields });
  }
  return {
    kind: "custom",
    amountCents: amountCents as number,
    ...(currency !== undefined ? { currency } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}
