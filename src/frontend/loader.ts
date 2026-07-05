// src/frontend/loader.ts

import type { Hono } from "hono";

import { pages } from "./pages.gen.ts";
import { render } from "./render.ts";

export function loadPages(app: Hono) {

  for (const page of pages) {

    app.get(page.route, (c) => render(c, page.module));

    if (page.route !== "/") {
      app.get(`${page.route}.html`, (c) => render(c, page.module));
    }

  }

}