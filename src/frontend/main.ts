/**
 * Frontend router. Serves the file based pages under `/`.
 */

import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { loadPages } from "@/frontend/loader.ts";

const web = new Hono();

// CSRF protection for browser-submitted forms (origin check).
web.use("*", csrf());

loadPages(web);

export default web;
