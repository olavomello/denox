/**
 * DenoX project configuration.
 *
 * `defineConfig` turns a partial, developer-friendly configuration into a
 * complete, validated {@link DenoxConfig} by deep-merging it over safe
 * production-ready defaults. Every feature is enabled by default and can be
 * disabled explicitly (production ready by default, opt-out by choice).
 *
 * SOLID: single responsibility — this module only knows how to describe and
 * resolve project configuration. It performs no I/O and reads no globals,
 * so it is trivially unit testable.
 */

/** Application metadata used by SEO, PWA and layouts. */
export interface AppMetadata {
  /** Product / site name (title tag, OG site name, manifest name). */
  readonly name: string;
  /** Short name for the PWA manifest (home screen label). */
  readonly shortName: string;
  /** Default description (meta description, OG, manifest). */
  readonly description: string;
  /**
   * Canonical base URL (e.g. "https://example.com"). Leave empty to resolve
   * from the incoming request (honoring x-forwarded-proto behind proxies).
   */
  readonly url: string;
  /** BCP-47 locale (html lang, og:locale). */
  readonly locale: string;
  /** Browser UI theme color (meta theme-color, manifest). */
  readonly themeColor: string;
  /** PWA splash background color (manifest). */
  readonly backgroundColor: string;
  /** Author metadata. */
  readonly author: string;
  /** Default keywords (meta keywords). */
  readonly keywords: readonly string[];
  /** Default social sharing image (absolute or public/ relative path). */
  readonly image: string;
}

/** SEO feature toggles. */
export interface SeoConfig {
  /** Master switch for all SEO output. */
  readonly enabled: boolean;
  /** Serve /sitemap.xml generated from the file based routes. */
  readonly sitemap: boolean;
  /** Serve /robots.txt. */
  readonly robots: boolean;
  /** Inject <link rel="canonical">. */
  readonly canonical: boolean;
  /** Inject Open Graph tags. */
  readonly openGraph: boolean;
  /** Inject Twitter Card tags. */
  readonly twitterCards: boolean;
  /** Inject JSON-LD structured data. */
  readonly jsonLd: boolean;
}

/** A PWA manifest icon entry. */
export interface PwaIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
  readonly purpose?: string;
}

/** PWA feature configuration. */
export interface PwaConfig {
  /** Serve /site.webmanifest generated from this configuration. */
  readonly enabled: boolean;
  /** Manifest display mode. */
  readonly display: "standalone" | "minimal-ui" | "fullscreen" | "browser";
  /** Manifest icons. */
  readonly icons: readonly PwaIcon[];
}

/** Performance feature toggles. */
export interface PerformanceConfig {
  /** Inject <link rel="preload"> for fonts found in public/assets/fonts. */
  readonly preloadFonts: boolean;
  /** Inject <link rel="preload"> for stylesheets in public/assets/css. */
  readonly preloadCss: boolean;
  /** Add loading="lazy" decoding="async" to page images without it. */
  readonly lazyImages: boolean;
  /** Cache-Control max-age (seconds) for static assets under public/. */
  readonly staticCacheSeconds: number;
}

/** Security feature toggles (details live in middleware/security.ts). */
export interface SecurityConfig {
  /** Apply secure headers + CSP globally. */
  readonly headers: boolean;
}

/** Fully resolved DenoX project configuration. */
export interface DenoxConfig {
  readonly app: AppMetadata;
  readonly seo: SeoConfig;
  readonly pwa: PwaConfig;
  readonly performance: PerformanceConfig;
  readonly security: SecurityConfig;
}

/** Recursive partial used for the developer-facing configuration input. */
export type DenoxUserConfig = {
  readonly app?: Partial<AppMetadata>;
  readonly seo?: Partial<SeoConfig>;
  readonly pwa?: Partial<PwaConfig>;
  readonly performance?: Partial<PerformanceConfig>;
  readonly security?: Partial<SecurityConfig>;
};

/** Production-ready defaults applied under any omitted option. */
export const DEFAULT_CONFIG: DenoxConfig = Object.freeze({
  app: {
    name: "DenoX",
    shortName: "DenoX",
    description: "A modern, fast and lightweight web framework powered by Deno.",
    url: "",
    locale: "en",
    themeColor: "#ffffff",
    backgroundColor: "#ffffff",
    author: "",
    keywords: [],
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
  pwa: {
    enabled: true,
    display: "standalone" as const,
    icons: [
      {
        src: "/images/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/favicon/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  },
  performance: {
    preloadFonts: true,
    preloadCss: true,
    lazyImages: true,
    staticCacheSeconds: 3600,
  },
  security: {
    headers: true,
  },
});

/**
 * Resolves a partial developer configuration into a complete
 * {@link DenoxConfig} by merging it over {@link DEFAULT_CONFIG}.
 *
 * @param user Partial project configuration.
 * @returns Frozen, fully populated configuration.
 */
export function defineConfig(user: DenoxUserConfig = {}): DenoxConfig {
  return Object.freeze({
    app: Object.freeze({ ...DEFAULT_CONFIG.app, ...user.app }),
    seo: Object.freeze({ ...DEFAULT_CONFIG.seo, ...user.seo }),
    pwa: Object.freeze({ ...DEFAULT_CONFIG.pwa, ...user.pwa }),
    performance: Object.freeze({ ...DEFAULT_CONFIG.performance, ...user.performance }),
    security: Object.freeze({ ...DEFAULT_CONFIG.security, ...user.security }),
  });
}
