/**
 * Unit tests — project configuration resolution (src/config/define_config.ts).
 */

import { assertEquals } from "@std/assert";
import { DEFAULT_CONFIG, defineConfig } from "@/config/define_config.ts";

Deno.test("defineConfig with no input returns full production defaults", () => {
  const config = defineConfig();
  assertEquals(config.seo.enabled, true);
  assertEquals(config.pwa.enabled, true);
  assertEquals(config.performance.lazyImages, true);
  assertEquals(config.security.headers, true);
  assertEquals(config.app.name, DEFAULT_CONFIG.app.name);
});

Deno.test("defineConfig merges partial input over defaults per section", () => {
  const config = defineConfig({
    app: { name: "MyApp", url: "https://my.app" },
    seo: { sitemap: false },
  });
  assertEquals(config.app.name, "MyApp");
  assertEquals(config.app.url, "https://my.app");
  assertEquals(config.app.locale, DEFAULT_CONFIG.app.locale);
  assertEquals(config.seo.sitemap, false);
  assertEquals(config.seo.robots, true);
});

Deno.test("defineConfig ships ui defaults and merges overrides", () => {
  const config = defineConfig({ ui: { nav: [{ label: "Only", href: "/only" }] } });
  assertEquals(config.ui.nav.length, 1);
  assertEquals(config.ui.brand.label, DEFAULT_CONFIG.ui.brand.label);
  assertEquals(DEFAULT_CONFIG.ui.favicons.length, 3);
});

Deno.test("defineConfig output is frozen", () => {
  const config = defineConfig();
  assertEquals(Object.isFrozen(config), true);
  assertEquals(Object.isFrozen(config.app), true);
});
