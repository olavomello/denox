/**
 * Signup page — `/signup`.
 *
 * Uses the data-api form helper: per-field errors, denox:success redirect
 * (data-redirect) and a no-JS PRG fallback (POST /signup in frontend/main).
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
  meta: {
    title: "Create account",
    description: "Create your account.",
  },
} as const;

/**
 * Renders the signup form.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default function signupPage(_c: Context): string {
  return `
    <h1>Create account</h1>
    <form data-api="/api/auth/signup" data-redirect="/" method="post" action="/signup">
      <label for="name">Name</label>
      <input id="name" name="name" type="text" required autocomplete="name" />
      <span data-error-for="name" class="field-error"></span>

      <label for="email">E-mail</label>
      <input id="email" name="email" type="email" required autocomplete="email" />
      <span data-error-for="email" class="field-error"></span>

      <label for="password">Password</label>
      <input id="password" name="password" type="password" required minlength="8" autocomplete="new-password" />
      <span data-error-for="password" class="field-error"></span>

      <button type="submit">Create account</button>
    </form>
    <p>Already registered? <a href="/login">Sign in</a>.</p>
  `;
}
