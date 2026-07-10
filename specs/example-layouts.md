---
feature: example-layouts
status: draft
author: claude
reviewed_by:
date: 2026-07-10
---

# Example Layouts — Specification

## Objective

Ship three complete layouts, visually distinct from the current design, to demonstrate the
framework's layout versatility — organized so trying one takes a single line (`layout: "<name>"` in
any page config) and adopting one as a base takes a copy.

## Scope

### In scope

- Three self-contained layouts under `src/frontend/layouts/examples/` (keeps the working set —
  default, showcase, product, partials, registry — clean), registered in the layout registry (they
  are passive functions; registration costs nothing and enables the one-line switch):
  - **`midnight`** — dark dashboard: fixed left sidebar navigation, neon accent, app-like density.
  - **`editorial`** — magazine: serif display type, centered measure-width column, generous
    whitespace, top-ruled header.
  - **`neobrutalist`** — bold: thick borders, hard offset shadows, flat vivid colors, oversized
    type.
- Each layout is **one file**: markup + a scoped `<style>` block (every rule namespaced under its
  `layout-<name>` body class so the globally injected `default.css` never bleeds in or out) — zero
  extra HTTP requests, trivially copy-pasteable into a real project.
- All three consume the **`ui` config data** (brand, nav, footer) but render it with their own
  markup — demonstrating that identity is data and presentation is the layout's choice. Dynamic
  values escaped, as everywhere.
- `docs/example-layouts.md`: gallery description, the one-line switch, and the "adopt as base" path
  (copy file, rename, register).
- Registry note documenting the folder convention.

### Out of scope

- Theme switching at runtime / user-selectable themes.
- Demo pages or routes (any existing page can try a layout via its config; adding routes just to
  exhibit layouts would pollute the scaffold).
- Dark-mode variant of the default layout (different feature).

## Functional Requirements

- FR-1: `layout: "midnight" | "editorial" | "neobrutalist"` works on any page with no other change.
- FR-2: Each layout renders brand label/logo, every nav item and the footer from `denox.config.ts`
  (own markup, escaped values).
- FR-3: Styles are fully scoped: rendering a page with an example layout and with the default layout
  produces no cross-contamination (body class namespacing).
- FR-4: SEO/PWA head injection (meta, favicons, stylesheets, manifest) works identically on example
  layouts — they are first-class documents.

## Non Functional Requirements

- NFR-1: Zero new dependencies, zero new HTTP requests per layout.
- NFR-2: No change to existing layouts, pages or tests.
- NFR-3: Each file readable top-to-bottom as a teaching artifact (comment header explaining the
  design idea and how to adopt it).

## Acceptance Criteria

- AC-1: Unit tests render each example layout with dummy content and assert: body class, brand
  label, every configured nav item, footer link and content presence.
- AC-2: Escaping test: hostile strings in ui config values render escaped in all three.
- AC-3: Integration: a page configured with each example layout returns 200 with the injected head
  (title + manifest) present.
- AC-4: `deno task ci` green with no modification to existing tests.

## Security Considerations

Same rules as production layouts: all config-derived values pass through `escapeHtml`; no inline
event handlers; scripts limited to the existing external files (CSP-safe).

## Tests

Unit render matrix (3 layouts × structure/escaping) + one integration round-trip per layout using a
temporary registered page route in the test app (or the about page's config override if simpler —
implementation detail left to the cycle).
