# Production Ready by Default

DenoX projects ship optimized for SEO, performance, security and PWA readiness with zero
configuration. Everything is driven by `denox.config.ts` at the project root; omit any option to
keep the production defaults, or disable features explicitly.

## Configuration

```ts
import { defineConfig } from "./src/config/define_config.ts";

export default defineConfig({
  app: { name: "MyApp", url: "https://my.app", themeColor: "#111111" },
  seo: { jsonLd: false }, // disable only what you don't want
  performance: { lazyImages: true },
});
```

## What you get automatically

| Area        | Behavior                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEO         | Title, description, keywords, author, canonical, Open Graph, Twitter Cards, JSON-LD injected on every page; `/sitemap.xml` from the route table; `/robots.txt`. |
| PWA         | `/site.webmanifest` generated from config; manifest link + theme-color injected.                                                                                |
| Performance | Preload for `public/assets/css` and `public/assets/fonts`; `loading="lazy"` on page images; `Cache-Control` on static assets.                                   |
| Security    | Secure headers + CSP on every response, including static assets (toggle: `security.headers`).                                                                   |

## Per-page metadata

```ts
export const config = {
  layout: "default",
  meta: {
    title: "About",
    description: "What DenoX is about.",
    image: "/images/about-cover.png",
    noindex: false,
  },
} as const;
```

Renders `<title>About — MyApp</title>` plus matching OG/Twitter/JSON-LD.

## Notes

- Custom layouts keep full control: tags already present in the document (title, canonical,
  manifest, description) are never duplicated.
- Mark above-the-fold images with `loading="eager"` to opt out of lazy loading (LCP optimization).
- With `app.url` empty, absolute URLs are derived from the request (`x-forwarded-proto` aware) —
  useful for previews.
