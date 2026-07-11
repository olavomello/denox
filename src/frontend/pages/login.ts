/**
 * Login page — `/login`.
 *
 * Uses the data-api form helper: per-field errors, denox:success redirect
 * (data-redirect) and a no-JS PRG fallback (POST /login in frontend/main).
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
  meta: {
    title: "Sign in",
    description: "Sign in to your account.",
  },
} as const;

/**
 * Renders the login form.
 *
 * @param c Request context.
 * @returns Page HTML.
 */
export default function loginPage(c: Context): string {
  const flag = new URL(c.req.url).searchParams.get("error");
  const notice = flag === "1"
    ? '<p class="field-error" role="alert">Invalid credentials. Please try again.</p>'
    : "";
  return `
    <h1>Sign in</h1>
    ${notice}
    <form data-api="/api/auth/login" data-redirect="/" method="post" action="/login">
      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required autocomplete="email" />
      <span data-error-for="email" class="field-error"></span>

      <label for="password">Password</label>
      <input id="password" name="password" type="password" required autocomplete="current-password" />
      <span data-error-for="password" class="field-error"></span>

      <button type="submit">Sign in</button>
    </form>
    <p>No account yet? <a href="/signup">Create one</a>.</p>
  `;
}
