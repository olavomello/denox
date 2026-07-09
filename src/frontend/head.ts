/**
 * Document head builder.
 *
 * Generates SEO (title, description, canonical, Open Graph, Twitter Cards,
 * JSON-LD), PWA (manifest link, theme color) and performance (asset preload)
 * tags from the project configuration plus optional per-page metadata, and
 * injects them into the rendered document without changing the layout
 * contract.
 *
 * Deduplication: tags the document already declares (title, canonical,
 * manifest, description) are skipped, so custom layouts that hardcode them
 * keep full control.
 */

import type { Context } from "hono";
import { site } from "@/config/site.ts";
import { escapeHtml } from "@/shared/html.ts";

/** Optional per-page metadata (exported by pages via `config.meta`). */
export interface PageMeta {
  /** Page title (composed as "title — app name"). */
  readonly title?: string;
  /** Page description. */
  readonly description?: string;
  /** Social sharing image for this page. */
  readonly image?: string;
  /** Canonical URL override. */
  readonly canonical?: string;
  /** Ask crawlers not to index this page. */
  readonly noindex?: boolean;
}

/**
 * Resolves the absolute base URL for canonical/OG/sitemap links.
 * Uses `app.url` when configured, otherwise derives it from the request,
 * honoring `x-forwarded-proto` behind reverse proxies.
 *
 * @param c Request context.
 * @returns Base URL without trailing slash.
 */
export function resolveBaseUrl(c: Context): string {
  if (site.app.url !== "") return site.app.url.replace(/\/+$/, "");
  const url = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${url.host}`;
}

/** Turns a possibly relative asset path into an absolute URL. */
function toAbsolute(base: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Removes HTML tags from a string. */
function stripHtml(value: string | undefined): string {
  return (value ?? "").replace(/<[^>]*>/g, "").trim();
}

/** Cached public/ asset discovery result. */
interface DiscoveredAssets {
  readonly css: readonly string[];
  readonly fonts: readonly string[];
}

/**
 * Discovers preloadable assets under public/ once at startup.
 * Returns empty lists when the runtime has no filesystem access.
 */
async function discoverAssets(): Promise<DiscoveredAssets> {
  if (typeof Deno === "undefined" || typeof Deno.readDir !== "function") {
    return { css: [], fonts: [] };
  }
  const list = async (dir: string, exts: readonly string[]): Promise<string[]> => {
    const found: string[] = [];
    try {
      for await (const entry of Deno.readDir(dir)) {
        if (entry.isFile && exts.some((ext) => entry.name.endsWith(ext))) {
          found.push(entry.name);
        }
      }
    } catch {
      // Directory absent: nothing to preload.
    }
    return found.sort();
  };
  return {
    css: (await list("public/assets/css", [".css"])).map((f) => `/assets/css/${f}`),
    fonts: (await list("public/assets/fonts", [".woff2", ".woff"])).map((f) =>
      `/assets/fonts/${f}`
    ),
  };
}

const assets: DiscoveredAssets = await discoverAssets();

/** Builds the JSON-LD script content, hardened against script breakout. */
function jsonLd(c: Context, meta: PageMeta | undefined, base: string): string {
  const isHome = new URL(c.req.url).pathname === "/";
  const data = {
    "@context": "https://schema.org",
    "@type": isHome ? "WebSite" : "WebPage",
    name: escapeHtml(meta?.title ?? site.app.name),
    description: escapeHtml(meta?.description ?? site.app.description),
    url: `${base}${new URL(c.req.url).pathname}`,
    ...(site.app.author !== "" ? { author: { "@type": "Person", name: site.app.author } } : {}),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Builds the head tags for a request and injects them into the rendered
 * document, right before `</head>`. Documents without a `</head>` are
 * returned unchanged.
 *
 * @param c Request context.
 * @param document Full HTML document produced by the layout.
 * @param meta Optional per-page metadata.
 * @returns Document with production-ready head tags injected.
 */
export function injectHead(c: Context, document: string, meta?: PageMeta): string {
  const closeAt = document.search(/<\/head>/i);
  if (closeAt === -1) return document;

  const base = resolveBaseUrl(c);
  const path = new URL(c.req.url).pathname;
  const title = meta?.title !== undefined ? `${meta.title} — ${site.app.name}` : site.app.name;
  const description = stripHtml(meta?.description ?? site.app.description);
  const image = toAbsolute(base, meta?.image ?? site.app.image);
  const canonical = meta?.canonical ?? `${base}${path}`;
  const tags: string[] = [];
  const has = (needle: string): boolean => document.includes(needle);

  if (!has("<title>")) tags.push(`<title>${escapeHtml(title)}</title>`);

  for (const icon of site.ui.favicons) {
    if (has(`href="${icon.href}"`)) continue;
    const sizes = icon.sizes !== undefined ? ` sizes="${escapeHtml(icon.sizes)}"` : "";
    const type = icon.type !== undefined ? ` type="${escapeHtml(icon.type)}"` : "";
    tags.push(
      `<link rel="${escapeHtml(icon.rel)}"${sizes}${type} href="${escapeHtml(icon.href)}">`,
    );
  }
  for (const href of site.ui.stylesheets) {
    if (!has(`href="${href}"`)) {
      tags.push(`<link rel="stylesheet" href="${escapeHtml(href)}">`);
    }
  }

  if (site.seo.enabled) {
    if (!has('name="description"')) {
      tags.push(`<meta name="description" content="${escapeHtml(description)}">`);
    }
    if (site.app.keywords.length > 0 && !has('name="keywords"')) {
      tags.push(`<meta name="keywords" content="${escapeHtml(site.app.keywords.join(", "))}">`);
    }
    if (site.app.author !== "" && !has('name="author"')) {
      tags.push(`<meta name="author" content="${escapeHtml(site.app.author)}">`);
    }
    if (meta?.noindex === true) {
      tags.push('<meta name="robots" content="noindex, nofollow">');
    }
    if (site.seo.canonical && !has('rel="canonical"')) {
      tags.push(`<link rel="canonical" href="${escapeHtml(canonical)}">`);
    }
    if (site.seo.openGraph) {
      tags.push(
        `<meta property="og:type" content="website">`,
        `<meta property="og:site_name" content="${escapeHtml(site.app.name)}">`,
        `<meta property="og:title" content="${escapeHtml(title)}">`,
        `<meta property="og:description" content="${escapeHtml(description)}">`,
        `<meta property="og:url" content="${escapeHtml(canonical)}">`,
        `<meta property="og:image" content="${escapeHtml(image)}">`,
        `<meta property="og:locale" content="${escapeHtml(site.app.locale)}">`,
      );
    }
    if (site.seo.twitterCards) {
      tags.push(
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escapeHtml(title)}">`,
        `<meta name="twitter:description" content="${escapeHtml(description)}">`,
        `<meta name="twitter:image" content="${escapeHtml(image)}">`,
      );
    }
    if (site.seo.jsonLd) {
      tags.push(`<script type="application/ld+json">${jsonLd(c, meta, base)}</script>`);
    }
  }

  if (site.pwa.enabled) {
    if (!has('rel="manifest"')) tags.push('<link rel="manifest" href="/site.webmanifest">');
    if (!has('name="theme-color"')) {
      tags.push(`<meta name="theme-color" content="${escapeHtml(site.app.themeColor)}">`);
    }
  }

  if (site.performance.preloadCss) {
    const cssList = site.ui.stylesheets.length > 0 ? site.ui.stylesheets : assets.css;
    for (const href of cssList) {
      tags.push(`<link rel="preload" href="${escapeHtml(href)}" as="style">`);
    }
  }
  if (site.performance.preloadFonts) {
    for (const href of assets.fonts) {
      const type = href.endsWith(".woff2") ? "font/woff2" : "font/woff";
      tags.push(
        `<link rel="preload" href="${escapeHtml(href)}" as="font" type="${type}" crossorigin>`,
      );
    }
  }

  if (tags.length === 0) return document;
  const block = `  ${tags.join("\n  ")}\n`;
  return document.slice(0, closeAt) + block + document.slice(closeAt);
}
