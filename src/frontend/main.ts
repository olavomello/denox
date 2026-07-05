/**
 * Frontend router. Serves the file based pages under `/`.
 */

import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { loadPages } from "@/frontend/loader.ts";
import { contactService } from "@/api/contact/contact.routes.ts";
import { parseCreateContactDto } from "@/api/contact/contact.dto.ts";
import { ValidationException } from "@/shared/exceptions/app_exception.ts";
import { registerPwaRoutes } from "@/frontend/pwa.routes.ts";
import { registerSeoRoutes } from "@/frontend/seo.routes.ts";

const web = new Hono();

// CSRF protection for browser-submitted forms (origin check).
web.use("*", csrf());

// Production-ready endpoints (config-driven): sitemap, robots, manifest.
registerSeoRoutes(web);
registerPwaRoutes(web);

// No-JS fallback for the contact form (Post-Redirect-Get). The enhanced
// path submits JSON to /api/contact; this route serves browsers without JS
// through the same DTO and service.
web.post("/contact", async (c) => {
  const body = await c.req.parseBody();
  try {
    const dto = parseCreateContactDto(body);
    await contactService.submit(dto);
    return c.redirect("/contact?sent=1", 303);
  } catch (error) {
    if (error instanceof ValidationException) {
      return c.redirect("/contact?error=1", 303);
    }
    throw error;
  }
});

loadPages(web);

export default web;
