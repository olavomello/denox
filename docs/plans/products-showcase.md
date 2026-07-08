# Products Showcase — Implementation Plan

1. Product model/DTO: optional description/imageUrl (+ repo spread-fix so optionals persist);
   repository `update()` (memory + KV).
2. Framework: per-request meta resolver in render.ts; HTML error pages for non-API routes in the
   error handler.
3. Layouts showcase/product + registry entries; showcase page + `[id]` dynamic page; regenerate
   routes; responsive CSS.
4. Upload: shared images sniffing + BlobStorage (memory/chunked KV); service attachImage/getImage;
   controller multipart + serving; routes.
5. Tests (13) across unit/integration; seed with descriptions; Insomnia requests for upload/serving.
6. Docs, ROADMAP entry, CHANGELOG, README.

Definition of done: `deno task ci` green; spec criteria covered by tests.
