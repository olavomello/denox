/**
 * Image sniffing helpers.
 *
 * Detects image formats from magic bytes — the client-provided content type
 * and filename are never trusted (safe upload requirement). Pure functions,
 * unit tested directly.
 */

/** Image content types accepted for product uploads. */
export type ImageContentType = "image/png" | "image/jpeg" | "image/webp";

/** Maximum accepted image size (fits the default request body limit). */
export const IMAGE_MAX_BYTES = 1_000_000;

/**
 * Detects a supported image format from its magic bytes.
 *
 * @param bytes Raw file bytes.
 * @returns Detected content type, or null when unsupported.
 */
export function sniffImageType(bytes: Uint8Array): ImageContentType | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Image dimensions in pixels. */
export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Reads dimensions from PNG/JPEG/WebP headers — pure TS, no codec.
 *
 * @param bytes Raw file bytes.
 * @returns Dimensions, or null when they cannot be determined.
 */
export function imageDimensions(bytes: Uint8Array): ImageDimensions | null {
  const type = sniffImageType(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (type === "image/png" && bytes.length >= 24) {
    // IHDR: width/height at offsets 16/20 (big-endian).
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (type === "image/jpeg") {
    // Scan segments for a SOFn marker carrying the frame dimensions.
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1]!;
      const size = view.getUint16(offset + 2);
      if (
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      ) {
        return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      }
      offset += 2 + size;
    }
    return null;
  }

  if (type === "image/webp" && bytes.length >= 30) {
    const format = String.fromCharCode(...bytes.subarray(12, 16));
    if (format === "VP8X") {
      const w = bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16);
      const h = bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16);
      return { width: w + 1, height: h + 1 };
    }
    if (format === "VP8 ") {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (format === "VP8L" && bytes.length >= 25) {
      const b = view.getUint32(21, true);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}
