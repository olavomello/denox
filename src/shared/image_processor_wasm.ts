/**
 * Wasm image processor — imagescript tier.
 *
 * Loaded dynamically by getImageProcessor() only when `media.optimization`
 * is true; the npm specifier below is computed so type-checking and CI on
 * projects that never enable the tier do not resolve the dependency.
 */

import type { ImageProcessor, ProcessedImage, ProcessOptions } from "@/shared/image_processor.ts";

/** Minimal imagescript surface used here. */
interface ScriptImage {
  readonly width: number;
  resize(width: number, height: number): void;
  encode(): Promise<Uint8Array>;
  encodeJPEG(quality: number): Promise<Uint8Array>;
  encodeWEBP(quality: number): Promise<Uint8Array>;
}
interface ImageScriptModule {
  Image: {
    decode(bytes: Uint8Array): Promise<ScriptImage>;
    RESIZE_AUTO: number;
  };
}

// Architecture note (benchmark finding): the npm distribution of
// imagescript loads NATIVE codecs via FFI (--allow-ffi, not Deno Deploy
// compatible); the deno.land/x build of the same version is pure wasm
// with the identical API — that is the one we load. Computed specifier so
// projects that never enable the tier resolve nothing.
const IMAGESCRIPT_SPECIFIER = "https://deno.land/x/" + "imagescript@1.3.0/mod.ts";

/** Pure-wasm processor: resize + PNG/JPEG/WebP encoding. */
export class WasmImageProcessor implements ImageProcessor {
  private module: Promise<ImageScriptModule> | null = null;

  /** Loads imagescript once. */
  private load(): Promise<ImageScriptModule> {
    this.module ??= import(IMAGESCRIPT_SPECIFIER) as Promise<ImageScriptModule>;
    return this.module;
  }

  /**
   * Applies the requested transformations.
   *
   * @param bytes Original image bytes.
   * @param contentType Original content type.
   * @param options Width/format/quality.
   * @returns Processed bytes and content type.
   */
  async process(
    bytes: Uint8Array,
    contentType: string,
    options: ProcessOptions,
  ): Promise<ProcessedImage> {
    if (options.width === undefined && options.format === undefined) {
      return { bytes, contentType };
    }
    const { Image } = await this.load();
    const image = await Image.decode(bytes);

    if (options.width !== undefined && options.width < image.width) {
      image.resize(options.width, Image.RESIZE_AUTO);
    }

    if (options.format === "webp") {
      return { bytes: await image.encodeWEBP(options.quality), contentType: "image/webp" };
    }
    if (contentType === "image/jpeg") {
      return { bytes: await image.encodeJPEG(options.quality), contentType };
    }
    return { bytes: await image.encode(), contentType: "image/png" };
  }
}
