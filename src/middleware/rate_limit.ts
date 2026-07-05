/**
 * Rate limiting middleware (fixed window, in memory).
 *
 * Limits requests per client IP using a fixed time window. Suitable for a
 * single instance; swap the store for Redis (same interface) when running
 * multiple replicas — see docs/architecture notes.
 */

import type { MiddlewareHandler } from "hono";
import { env } from "@/config/env.ts";
import { TooManyRequestsException } from "@/shared/exceptions/app_exception.ts";

interface WindowEntry {
  count: number;
  resetAt: number;
}

/** Options for {@link rateLimit}. Defaults come from the environment. */
export interface RateLimitOptions {
  readonly max?: number;
  readonly windowMs?: number;
}

/**
 * Creates a rate limiting middleware instance with its own counter store.
 *
 * @param options Optional overrides for max requests and window size.
 * @returns Hono middleware enforcing the limit.
 */
export function rateLimit(options: RateLimitOptions = {}): MiddlewareHandler {
  const max = options.max ?? env.RATE_LIMIT_MAX;
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const windows = new Map<string, WindowEntry>();

  return async (c, next) => {
    const now = Date.now();
    const key = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

    const entry = windows.get(key);
    if (entry === undefined || entry.resetAt <= now) {
      windows.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
        throw new TooManyRequestsException("Rate limit exceeded", {
          limit: max,
          windowMs,
        });
      }
    }

    // Opportunistic cleanup keeps the map from growing unbounded.
    if (windows.size > 10_000) {
      for (const [k, v] of windows) {
        if (v.resetAt <= now) windows.delete(k);
      }
    }

    await next();
  };
}
