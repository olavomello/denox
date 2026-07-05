# Production Ready by Default — Architecture

## Components

```
denox.config.ts                    developer configuration (root, defineConfig)
src/config/define_config.ts       types + defaults + merge (pure)
src/config/site.ts                resolved config singleton
src/frontend/head.ts              head builder + injector + base URL resolver
src/frontend/optimize.ts          lazy images transform (pure)
src/frontend/seo.routes.ts        /sitemap.xml, /robots.txt
src/frontend/pwa.routes.ts        /site.webmanifest (generated)
src/middleware/security.ts        headers toggle (site.security.headers)
src/app.ts                        static serving after security, cache headers
```

## Flow — page request

1. Page renders content → `lazifyImages` (content only, layout untouched).
2. Layout wraps content (unchanged `(c, content)` contract).
3. `injectHead` builds tags from `site` + `page.config.meta` and inserts them before `</head>`,
   skipping tags the document already declares.

## Dependency direction

frontend/head, seo.routes, pwa.routes → config/site → denox.config.ts → config/define_config (pure).
No module reads the root config directly except `site.ts`.

## Risks

- Regex-based image transform: documented limitation for exotic markup; applies to
  framework-rendered content only.
- Dedup checks are substring-based: a page mentioning `<title>` in body text would suppress
  injection — acceptable, documented.
- Startup asset discovery requires `--allow-read` (already granted).
