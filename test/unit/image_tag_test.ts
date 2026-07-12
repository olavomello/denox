/**
 * Unit tests — responsive imageTag helper.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { imageTag } from "@/frontend/image.ts";

const image = { url: "/uploads/products/p1/a.png", width: 800, height: 600, alt: "" };

Deno.test("imageTag emits srcset for every configured width plus CLS attributes", () => {
  const html = imageTag(image, { fallbackAlt: "My Product", sizes: "100vw" });
  for (const w of [320, 640, 960, 1280]) {
    assertStringIncludes(html, `/uploads/products/p1/a.png?w=${w} ${w}w`);
  }
  assertStringIncludes(html, 'width="800" height="600"');
  assertStringIncludes(html, 'sizes="100vw"');
  assertStringIncludes(html, 'alt="My Product"');
  assertStringIncludes(html, 'loading="lazy"');
});

Deno.test("imageTag honors eager policy, alt override and hostile escaping", () => {
  const eager = imageTag({ ...image, alt: 'Custom "Alt" <b>' }, {
    fallbackAlt: "x",
    eager: true,
  });
  assertStringIncludes(eager, 'loading="eager"');
  assertStringIncludes(eager, "Custom &quot;Alt&quot; &lt;b&gt;");
  assertEquals(eager.includes("<b>"), false);
});

Deno.test("imageTag omits dimensions when unknown (legacy 0x0)", () => {
  const html = imageTag({ ...image, width: 0, height: 0 }, { fallbackAlt: "x" });
  assertEquals(html.includes("width="), false);
});
