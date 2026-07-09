/**
 * Deno KV backed {@link ProductRepository}.
 * Key layout: ["products", id] → Product.
 */

import type { NewProduct, Product, ProductPatch } from "@/api/products/product.model.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";

/** KV implementation of {@link ProductRepository}. */
export class KvProductRepository implements ProductRepository {
  constructor(private readonly kv: Deno.Kv) {}

  /** @returns Every stored product. */
  async findAll(): Promise<readonly Product[]> {
    const products: Product[] = [];
    for await (const entry of this.kv.list<Product>({ prefix: ["products"] })) {
      products.push(entry.value);
    }
    return products;
  }

  /** @returns The product with the given id, or null. */
  async findById(id: string): Promise<Product | null> {
    const entry = await this.kv.get<Product>(["products", id]);
    return entry.value;
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
