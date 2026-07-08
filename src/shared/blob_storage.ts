/**
 * Binary blob storage.
 *
 * Driver-aware storage for uploaded files (product images today; any binary
 * later). Mirrors the repository pattern: an interface, an in-memory
 * implementation (development/tests) and a Deno KV implementation that
 * chunks blobs across values — KV caps each value at 64 KiB, so files are
 * split into chunks and reassembled on read. Works locally and on Deno
 * Deploy with zero external dependencies.
 */

import { env } from "@/config/env.ts";
import { requireKv } from "@/shared/storage.ts";

/** A stored binary blob. */
export interface Blob {
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

/** Storage contract for binary blobs. */
export interface BlobStorage {
  put(key: string, blob: Blob): Promise<void>;
  get(key: string): Promise<Blob | null>;
  delete(key: string): Promise<void>;
}

/** In memory {@link BlobStorage} for development and tests. */
export class InMemoryBlobStorage implements BlobStorage {
  private readonly blobs = new Map<string, Blob>();

  /** Stores a blob under the given key. */
  put(key: string, blob: Blob): Promise<void> {
    this.blobs.set(key, blob);
    return Promise.resolve();
  }

  /** @returns The blob for the key, or null. */
  get(key: string): Promise<Blob | null> {
    return Promise.resolve(this.blobs.get(key) ?? null);
  }

  /** Removes the blob for the key. */
  delete(key: string): Promise<void> {
    this.blobs.delete(key);
    return Promise.resolve();
  }
}

/** KV chunk size, safely under the 64 KiB per-value ceiling. */
const CHUNK_SIZE = 60_000;

/** Metadata stored alongside the chunks. */
interface BlobMeta {
  readonly contentType: string;
  readonly size: number;
  readonly chunks: number;
}

/**
 * Deno KV backed {@link BlobStorage}.
 *
 * Key layout:
 *   ["blobs", key, "meta"]     → BlobMeta
 *   ["blobs", key, "chunk", i] → Uint8Array (≤ CHUNK_SIZE)
 *
 * Meta is written last so readers never observe a partial blob; replaced
 * blobs have their previous chunks cleared first.
 */
export class KvBlobStorage implements BlobStorage {
  constructor(private readonly kv: Deno.Kv) {}

  /** Stores a blob, chunking it across KV values. */
  async put(key: string, blob: Blob): Promise<void> {
    await this.delete(key);
    const chunks = Math.ceil(blob.bytes.length / CHUNK_SIZE) || 1;
    for (let i = 0; i < chunks; i++) {
      const chunk = blob.bytes.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await this.kv.set(["blobs", key, "chunk", i], chunk);
    }
    const meta: BlobMeta = { contentType: blob.contentType, size: blob.bytes.length, chunks };
    await this.kv.set(["blobs", key, "meta"], meta);
  }

  /** @returns The reassembled blob, or null when absent. */
  async get(key: string): Promise<Blob | null> {
    const meta = await this.kv.get<BlobMeta>(["blobs", key, "meta"]);
    if (meta.value === null) return null;
    const bytes = new Uint8Array(meta.value.size);
    for (let i = 0; i < meta.value.chunks; i++) {
      const chunk = await this.kv.get<Uint8Array>(["blobs", key, "chunk", i]);
      if (chunk.value === null) return null;
      bytes.set(chunk.value, i * CHUNK_SIZE);
    }
    return { contentType: meta.value.contentType, bytes };
  }

  /** Removes the blob and every chunk under the key. */
  async delete(key: string): Promise<void> {
    for await (const entry of this.kv.list({ prefix: ["blobs", key] })) {
      await this.kv.delete(entry.key);
    }
  }
}

/**
 * Chooses the {@link BlobStorage} implementation for the configured storage
 * driver.
 *
 * @returns Blob storage instance.
 */
export function createBlobStorage(): BlobStorage {
  return env.STORAGE_DRIVER === "kv" ? new KvBlobStorage(requireKv()) : new InMemoryBlobStorage();
}
