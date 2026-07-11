/**
 * Users page — `/users`.
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
} as const;

/**
 * Renders the users page body.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default function usersPage(_c: Context): string {
  return `
    <h1>Users</h1>
    <p>User data is served by the JSON API at <a href="/api/users">/api/users</a>.</p>
    <br>
    <a class="login" href="/login">Login</a>
  `;
}
