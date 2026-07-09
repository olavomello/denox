/**
 * Deno KV backed {@link ProductRepository}.
 * Key layout: ["products", id] → Product.
 */

import type { NewProduct, Product, ProductPatch } from "@/api/products/product.model.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";

/** Shape of records persisted before the multi-image revision. */
type StoredProduct = Omit<Product, "images"> & {
  readonly images?: readonly string[];
  /** Legacy single-image field from the first upload revision. */
  readonly imageUrl?: string;
};

/** KV implementation of {@link ProductRepository}. */
export class KvProductRepository implements ProductRepository {
  constructor(private readonly kv: Deno.Kv) {}

  /**
   * Hydrates a stored record into the current {@link Product} shape.
   * Records written before the multi-image revision have no `images` field
   * (and may carry a dead legacy `imageUrl`) — schema evolution is resolved
   * here, at the persistence boundary, so services and pages never see
   * legacy shapes.
   */
  private hydrate(stored: StoredProduct): Product {
    const { imageUrl: _legacy, ...rest } = stored;
    return { ...rest, images: stored.images ?? [] };
  }

  /** @returns Every stored product. */
  async findAll(): Promise<readonly Product[]> {
    const products: Product[] = [];
    for await (const entry of this.kv.list<StoredProduct>({ prefix: ["products"] })) {
      products.push(this.hydrate(entry.value));
    }
    return products;
  }

  /** @returns The product with the given id, or null. */
  async findById(id: string): Promise<Product | null> {
    const entry = await this.kv.get<StoredProduct>(["products", id]);
    return entry.value === null ? null : this.hydrate(entry.value);
  }

  /** Persists a new product and returns it with generated fields. */
  async create(data: NewProduct): Promise<Product> {
    const product: Product = {
      id: crypto.randomUUID(),
      ...data,
      images: [],
      createdAt: new Date().toISOString(),
    };
    await this.kv.set(["products", product.id], product);
    return product;
  }

  /** Applies a partial update; @returns the updated product or null. */
  async update(id: string, patch: ProductPatch): Promise<Product | null> {
    const existing = await this.findById(id);
    if (existing === null) return null;
    const updated: Product = { ...existing, ...patch };
    await this.kv.set(["products", id], updated);
    return updated;
  }

  /** Removes a product; @returns whether it existed. */
  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (existing === null) return false;
    await this.kv.delete(["products", id]);
    return true;
  }
}
