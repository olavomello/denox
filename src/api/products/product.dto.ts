/**
 * Product DTOs and validation. Parses untrusted input at the boundary and
 * throws {@link ValidationException} with per-field details on failure.
 */

import { ValidationException } from "@/shared/exceptions/app_exception.ts";
import type { NewProduct } from "@/api/products/product.model.ts";

/** Payload accepted by `POST /api/products`. */
export type CreateProductDto = NewProduct;

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const PRICE_MAX = 1_000_000;

/**
 * Validates and normalizes the create-product payload.
 *
 * @param input Untrusted request body.
 * @returns Typed, trimmed DTO.
 * @throws {ValidationException} When any field is invalid.
 */
export function parseCreateProductDto(input: unknown): CreateProductDto {
  const fields: Record<string, string> = {};

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationException("Request body must be a JSON object");
  }

  const body = input as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    fields.name = `name must be a string with ${NAME_MIN_LENGTH}-${NAME_MAX_LENGTH} characters`;
  }

  const price = typeof body.price === "number" ? body.price : Number.NaN;
  if (!Number.isFinite(price) || price <= 0 || price > PRICE_MAX) {
    fields.price = `price must be a number between 0 (exclusive) and ${PRICE_MAX}`;
  }

  if (Object.keys(fields).length > 0) {
    throw new ValidationException("Invalid product payload", { fields });
  }

  return { name, price };
}
