/**
 * DenoX project configuration.
 *
 * Every option is optional: omitted values fall back to production-ready
 * defaults (see src/config/define_config.ts). Features are enabled by
 * default and can be disabled explicitly, e.g. `seo: { sitemap: false }`.
 */

import { defineConfig } from "./src/config/define_config.ts";

export default defineConfig({
  app: {
    name: "DenoX",
    shortName: "DenoX",
    description: "A modern, fast and lightweight web framework powered by Deno.",
    url: "https://denox.olavomello.deno.net",
    locale: "en",
    themeColor: "#ffffff",
    backgroundColor: "#ffffff",
    author: "Olavo Mello",
    keywords: ["deno", "framework", "hono", "typescript", "mvc", "full stack"],
    image: "/images/denox-cover.png",
  },
  seo: {
    enabled: true,
    sitemap: true,
    robots: true,
    canonical: true,
    openGraph: true,
    twitterCards: true,
    jsonLd: true,
  },
  payments: {
    provider: "stripe",
    currency: "usd", // "brl" etc. (see https://stripe.com/docs/currencies)
    successPath: "/",
    cancelPath: "/",
  },
  pwa: {
    enabled: true,
  },
  performance: {
    preloadFonts: true,
    preloadCss: true,
    lazyImages: true,
  },
  security: {
    headers: true,
  },
});
