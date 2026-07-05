/**
 * HTTP response envelope helpers.
 *
 * Every JSON endpoint answers with the same envelope so API consumers can
 * rely on a single shape: `{ success: true, data }` on success and
 * `{ success: false, error }` on failure.
 */

import type { ErrorCode, ErrorDetails } from "@/shared/exceptions/app_exception.ts";

/** Successful API envelope. */
export interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
}

/** Failed API envelope. */
export interface ApiError {
  readonly success: false;
  readonly error: {
    readonly code: ErrorCode;
    readonly message: string;
    readonly details?: ErrorDetails;
  };
}

/**
 * Wraps payload data in the standard success envelope.
 *
 * @param data Payload to return to the client.
 * @returns Success envelope.
 */
export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

/**
 * Builds the standard error envelope.
 *
 * @param code Stable machine readable error code.
 * @param message Human readable message (safe for clients).
 * @param details Optional structured details.
 * @returns Error envelope.
 */
export function fail(code: ErrorCode, message: string, details?: ErrorDetails): ApiError {
  return { success: false, error: { code, message, ...(details ? { details } : {}) } };
}
