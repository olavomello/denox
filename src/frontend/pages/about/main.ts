/**
 * About page — `/about`.
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
  meta: {
    title: "About",
    description: "DenoX combines file based routing, MVC and native Deno APIs on top of Hono.",
  },
} as const;

/**
 * Renders the about page body.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default function aboutPage(_c: Context): string {
  return `
    <h1>About DenoX</h1>
    <p>DenoX combines file based routing, MVC and native Deno APIs on top of Hono.</p>
  `;
}
