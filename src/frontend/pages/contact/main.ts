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
      "DenoX contact page made easy just creating a new <b>pages/folder</b> and managing the informations on <b>main.ts</b> file.",
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
  `;
}
