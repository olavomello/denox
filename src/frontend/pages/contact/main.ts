/**
 * About page — `/about`.
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
 * Renders the about page body.
 *
 * @param _c Request context.
 * @returns Page HTML.
 */
export default function aboutPage(_c: Context): string {
  return `
    <h1>${config.meta.title}</h1>
    <p>${config.meta.description} </p>
    <br>
    <!-- Form example -->
    <form action="/contact" method="post">
      <label for="name">Name:</label>
      <input type="text" id="name" name="name" required>
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required>
      <label for="message">Message:</label>
      <textarea id="message" name="message" required></textarea>
      <button type="submit">Submit</button>
    </form>
  `;
}
