/**
 * Home page — `/`.
 *
 * Demonstrates safe interpolation of untrusted input (`?name=` query)
 * through `escapeHtml`.
 */

import type { Context } from "hono";
import { escapeHtml } from "@/shared/html.ts";

/** Page configuration. */
export const config = {
  layout: "default",
} as const;

/**
 * Renders the home page body.
 *
 * @param c Request context.
 * @returns Page HTML.
 */
export default function homePage(c: Context): string {
  const name = escapeHtml(c.req.query("name") ?? "world");
  return `
    <h1>Hello, ${name}!</h1>
    <p>Welcome to <strong>DenoX</strong> — a full stack framework for Deno powered by Hono.</p>
    <p>Try <a href="/?name=Deno">/?name=Deno</a> or the JSON API at <a href="/api/ping">/api/ping</a>.</p>
  `;
}
