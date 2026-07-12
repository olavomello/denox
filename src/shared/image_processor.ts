/**
 * Image processing abstraction.
 *
 * The default PassthroughProcessor keeps DenoX zero-dependency: it serves
 * original bytes and ignores transformation params (the URL contract stays
 * stable). Enabling `media.optimization` in denox.config.ts dynamically
 * loads the wasm tier (imagescript — chosen by benchmark: decode + resize
 * + PNG/JPEG/WebP encode in a single pure-wasm package, Deno Deploy
 * compatible). This is the framework's one deliberate, isolated,
 * off-by-default dependency exception.
 */

import { site } from "@/config/site.ts";
import { logger } from "@/shared/logger.ts";

/** Transformation request. */
export interface ProcessOptions {
  /** Target width in px (aspect ratio preserved). */
  readonly width?: number;
  /** Target format. */
  readonly format?: "webp";
  /** Lossy quality 1-100. */
  readonly quality: number;
}

/** Processing result. */
export interface ProcessedImage {
  readonly bytes: Uint8Array;
  readonly contentType: string;
}

/** Contract for image processors. */
export interface ImageProcessor {
  process(
    bytes: Uint8Array,
    contentType: string,
    options: ProcessOptions,
  ): Promise<ProcessedImage>;
}

/** Zero-dependency processor: original bytes, params ignored. */
export class PassthroughProcessor implements ImageProcessor {
  /** @returns The input unchanged. */
  process(
    bytes: Uint8Array,
    contentType: string,
    _options: ProcessOptions,
  ): Promise<ProcessedImage> {
    return Promise.resolve({ bytes, contentType });
  }
}

let instance: ImageProcessor | null = null;

/**
 * Resolves the configured processor (memoized). Falls back to passthrough
 * with a logged warning when the wasm tier fails to load.
 *
 * @returns Processor instance.
 */
export async function getImageProcessor(): Promise<ImageProcessor> {
  if (instance !== null) return instance;
  if (!site.media.optimization) {
    instance = new PassthroughProcessor();
    return instance;
  }
  try {
    const mod = await import("@/shared/image_processor_wasm.ts");
    instance = new mod.WasmImageProcessor();
    logger.info("Image optimization enabled (wasm processor)");
  } catch (error) {
    logger.error("Failed to load the wasm image processor; falling back to passthrough", {
      message: error instanceof Error ? error.message : String(error),
    });
    instance = new PassthroughProcessor();
  }
  return instance;
}
