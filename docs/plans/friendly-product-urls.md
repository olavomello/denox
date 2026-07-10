# Friendly Product URLs — Implementation Plan

1. `shared/slug.ts` (slugify, slugCandidate, SLUG_PATTERN) + unit matrix.
2. Product model: required `slug`; repositories: findBySlug + atomic claim with collision suffixes
   (memory map / KV atomic index) + slug change on update (old mapping kept) + lazy migration of
   pre-slug records.
3. DTO: optional validated `slug` on PATCH (JSON and multipart).
4. Page rename `[id].ts` → `[slug].ts`; resolution middleware with both 301 flows; showcase links by
   slug; routes regenerated.
5. `registerSitemapProvider` in seo.routes; products provider in the frontend composition root.
6. Tests: 10 new (unit matrix; creation/collision incl. concurrent; page by slug; UUID 301;
   stale-slug 301; PATCH slug matrix; name-rename stability; sitemap entries; legacy
   materialization); existing page-URL tests updated to slugs.
7. Insomnia PATCH requests updated; docs + CHANGELOG.

Definition of done: `deno task ci` green; spec criteria covered.
