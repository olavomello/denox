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
import { escapeHtml } from "@/shared/html.ts";
import { logger } from "@/shared/logger.ts";

/** Minimal standalone HTML error page (no layout coupling). */
function errorPage(status: number, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${status}</title>
<link rel="stylesheet" href="/assets/css/default.css"></head>
<body><main class="error-page"><h1>${status}</h1><p>${escapeHtml(message)}</p>
<p><a href="/">Back to home</a></p></main></body></html>`;
}

/** True when the request expects an HTML page rather than a JSON envelope. */
function wantsHtml(c: Context): boolean {
  return !c.req.path.startsWith("/api");
}

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
    if (wantsHtml(c)) {
      return c.html(errorPage(err.status, err.message), err.status as ContentfulStatusCode);
    }
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
  if (wantsHtml(c)) {
    return c.html(errorPage(500, "Internal server error"), 500);
  }
  return c.json(fail("INTERNAL_ERROR", "Internal server error"), 500);
}

/**
 * Hono `notFound` handler for unmatched routes.
 *
 * @param c Request context.
 * @returns JSON 404 response.
 */
export function notFoundHandler(c: Context): Response {
  if (wantsHtml(c)) {
    return c.html(errorPage(404, "Page not found"), 404);
  }
  return c.json(fail("NOT_FOUND", `Route ${c.req.method} ${c.req.path} not found`), 404);
}
