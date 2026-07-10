/**
 * Unit tests — example layouts (midnight, editorial, neobrutalist).
 * Renders each with an injected (hostile) ui config to verify structure
 * and escaping without touching the frozen site singleton.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import type { Context } from "hono";
import type { UiConfig } from "@/config/define_config.ts";
import { render as midnight } from "@/frontend/layouts/examples/midnight.ts";
import { render as editorial } from "@/frontend/layouts/examples/editorial.ts";
import { render as neobrutalist } from "@/frontend/layouts/examples/neobrutalist.ts";
import { layouts } from "@/frontend/layouts/registry.ts";

const hostileUi: UiConfig = {
  favicons: [],
  stylesheets: [],
  brand: { label: '<Evil> & "Co"', href: "/", logo: "/images/icon.png" },
  nav: [
    { label: "Home<script>alert(1)</script>", href: "/" },
    { label: "Docs", href: "/docs" },
  ],
  footer: { text: "Made by", label: "X<i>ss", href: "https://example.com" },
};

const fakeContext = {} as Context;

const cases = [
  { name: "midnight", render: midnight },
  { name: "editorial", render: editorial },
  { name: "neobrutalist", render: neobrutalist },
] as const;

for (const { name, render } of cases) {
  Deno.test(`${name} layout renders structure and ui data escaped`, () => {
    const html = render(hostileUi, fakeContext, "<p>PAGE-CONTENT</p>");

    assertStringIncludes(html, `class="layout-${name}"`);
    assertStringIncludes(html, "<p>PAGE-CONTENT</p>");
    // Brand and footer from config, escaped:
    assertStringIncludes(html, "&lt;Evil&gt; &amp; &quot;Co&quot;");
    assertStringIncludes(html, "X&lt;i&gt;ss");
    assertStringIncludes(html, 'href="https://example.com"');
    // Every nav item present, hostile one neutralized:
    assertStringIncludes(html, "Home&lt;script&gt;");
    assertStringIncludes(html, ">Docs</a>");
    assertEquals(html.includes("<script>alert(1)</script>"), false);
    // Styles are scoped to the layout class:
    assertEquals(html.includes(`.layout-${name} `), true);
  });
}

Deno.test("all three example layouts are registered for one-line switching", () => {
  assertEquals(typeof layouts.midnight, "function");
  assertEquals(typeof layouts.editorial, "function");
  assertEquals(typeof layouts.neobrutalist, "function");
});
