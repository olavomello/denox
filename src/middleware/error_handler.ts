/**
 * Centralized error handling.
 *
 * The single place where exceptions become HTTP responses:
 * - {@link AppException} subclasses map to their status/code/details.
 * - Anything else becomes an opaque 500. Stack traces are logged, never
 *   exposed to clients (error masking).
 *
 * Controllers and services must never build error responses themselves.
 */

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AppException } from "@/shared/exceptions/app_exception.ts";
import { fail } from "@/shared/http.ts";
import { logger } from "@/shared/logger.ts";

/**
 * Hono `onError` handler. Translates thrown errors into the standard
 * error envelope.
 *
 * @param err Error thrown anywhere in the pipeline.
 * @param c Request context.
 * @returns JSON error response.
 */
export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof AppException) {
    logger.warn("Request failed", {
      code: err.code,
      status: err.status,
      path: c.req.path,
      message: err.message,
    });
    return c.json(
      fail(err.code, err.message, err.details),
      err.status as ContentfulStatusCode,
    );
  }

  logger.error("Unhandled error", {
    path: c.req.path,
    message: err.message,
    stack: err.stack,
  });
  return c.json(fail("INTERNAL_ERROR", "Internal server error"), 500);
}

/**
 * Hono `notFound` handler for unmatched routes.
 *
 * @param c Request context.
 * @returns JSON 404 response.
 */
export function notFoundHandler(c: Context): Response {
  return c.json(fail("NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`), 404);
}
