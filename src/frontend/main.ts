/**
 * Frontend router. Serves the file based pages under `/`.
 */

import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { loadPages } from "@/frontend/loader.ts";
import { registerPwaRoutes } from "@/frontend/pwa.routes.ts";
import { registerSeoRoutes } from "@/frontend/seo.routes.ts";

const web = new Hono();

// CSRF protection for browser-submitted forms (origin check).
web.use("*", csrf());

// Production-ready endpoints (config-driven): sitemap, robots, manifest.
registerSeoRoutes(web);
registerPwaRoutes(web);

loadPages(web);

export default web;
