/**
 * Contact page — `/contact`.
 *
 * Reference implementation of the DenoX form interaction convention:
 * `data-api` submits JSON to the API without navigation (page state kept),
 * per-field errors land in `[data-error-for]` slots, and the native
 * `action` POST remains as the no-JS fallback (PRG via /contact?sent=1).
 */

import type { Context } from "hono";

/** Page configuration. */
export const config = {
  layout: "default",
  meta: {
    title: "Contact",
    description:
      "Creating contact page is easy: simply create a new <b>pages</b> folder or file and manage the information in the <b>main.ts</b> file.",
  },
} as const;

/**
 * Renders the contact page body.
 *
 * @param c Request context.
 * @returns Page HTML.
 */
export default function contactPage(c: Context): string {
  const sent = c.req.query("sent") === "1";
  const failed = c.req.query("error") === "1";
  return `
    <h1>${config.meta.title}</h1>
    <p>${config.meta.description} </p>
    ${sent ? '<p class="success" role="status">Thanks! We received your message.</p>' : ""}
    ${
    failed ? '<p class="field-error" role="alert">Please check the fields and try again.</p>' : ""
  }
    <br>
    <!-- Form example: data-api enables the DenoX form helper -->
    <form data-api="/api/contact" data-target="#form-response" data-reset="true"
      action="/contact" method="post">
      <label for="name">Name:</label>
      <input type="text" id="name" name="name" required placeholder="Enter your name">
      <span data-error-for="name" role="alert" aria-live="polite" class="field-error"></span>
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required placeholder="Enter your email">
      <span data-error-for="email" role="alert" aria-live="polite" class="field-error"></span>
      <label for="message">Message:</label>
      <textarea id="message" name="message" required placeholder="Enter your message"></textarea>
      <span data-error-for="message" role="alert" aria-live="polite" class="field-error"></span>
      <button type="submit">Submit</button>
    </form>
    <template id="form-response">
      <p class="success">Thanks! We received your message.</p>
    </template>
  `;
}
