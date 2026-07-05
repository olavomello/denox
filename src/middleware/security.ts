/**
 * Security middleware stack.
 *
 * Secure headers (CSP, XSS, clickjacking protection), CORS, request body
 * size limits and request timeouts are configured HERE, once, and applied
 * globally in the composition root (src/app.ts). Features must never
 * re-implement these concerns.
 */

import type { MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { timeout } from "hono/timeout";
import { env } from "@/config/env.ts";
import { site } from "@/config/site.ts";

/**
 * Builds the ordered list of global security middleware.
 *
 * @returns Middleware to apply on every route.
 */
export function security(): readonly MiddlewareHandler[] {
  const headers: MiddlewareHandler[] = site.security.headers
    ? [
      secureHeaders({
        contentSecurityPolicy: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
        },
        xFrameOptions: "DENY",
        referrerPolicy: "no-referrer",
      }),
    ]
    : [];
  return [
    ...headers,
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : [...env.CORS_ORIGIN],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 86_400,
    }),
    bodyLimit({ maxSize: env.MAX_BODY_SIZE_BYTES }),
    timeout(env.REQUEST_TIMEOUT_MS),
  ];
}
