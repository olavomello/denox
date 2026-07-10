# Example Layouts

Three complete layouts, visually distinct from the default design, live in
`src/frontend/layouts/examples/` — proof that the same `ui` config data (brand, nav, footer) can
wear radically different skins.

## The gallery

- **`midnight`** — dark dashboard: fixed sidebar navigation, near-black canvas, neon cyan accent,
  app-like density.
- **`editorial`** — magazine: serif display type, centered measure-width reading column, generous
  whitespace, hairline rules.
- **`neobrutalist`** — loud: thick black borders, hard offset shadows, flat vivid color blocks,
  oversized uppercase type.

## Try one (one line)

```ts
// any page, e.g. src/frontend/pages/about.ts
export const config = {
  layout: "midnight", // or "editorial" | "neobrutalist"
} as const;
```

## Adopt one as your base

1. Copy the file out of `examples/` (e.g. to `layouts/mytheme.ts`);
2. Rename the exported function and the `layout-<name>` body class;
3. Register it in `layouts/registry.ts`;
4. Customize freely — every style rule is scoped under the body class, so changes never leak into
   other layouts (and `default.css` never leaks in).

## Design notes

Each layout is a single self-contained file (markup + scoped `<style>`, zero extra HTTP requests).
Identity data comes from `denox.config.ts` and is escaped at render time; SEO/PWA head injection
(title, favicons, manifest, stylesheets) works on them like on any production layout.
