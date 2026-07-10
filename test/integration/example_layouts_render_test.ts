/**
 * Integration tests — example layouts as first-class documents: rendered
 * through the real pipeline (render + head injection) they must carry the
 * page title, manifest and configured favicons like any production layout.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { Hono } from "hono";
import { render } from "@/frontend/render.ts";
import type { PageModule } from "@/frontend/render.ts";

for (const layout of ["midnight", "editorial", "neobrutalist"] as const) {
  Deno.test(`a page using the ${layout} layout renders with injected head`, async () => {
    const page: PageModule = {
      config: { layout, meta: { title: "Example Page" } },
      default: () => "<h1>Hello from the example</h1>",
    };
    const app = new Hono().get("/x", (c) => render(c, page));

    const res = await app.request("http://localhost/x");
    assertEquals(res.status, 200);
    const html = await res.text();

    assertStringIncludes(html, `class="layout-${layout}"`);
    assertStringIncludes(html, "Hello from the example");
    assertStringIncludes(html, "<title>Example Page");
    assertStringIncludes(html, 'rel="manifest"');
    assertStringIncludes(html, "favicon-32x32.png");
  });
}
