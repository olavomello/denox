/**
 * Deno KV backed {@link ProductRepository}.
 * Key layout: ["products", id] → Product.
 */

import type { NewProduct, Product } from "@/api/products/product.model.ts";
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
      name: data.name,
      price: data.price,
      createdAt: new Date().toISOString(),
    };
    await this.kv.set(["products", product.id], product);
    return product;
  }
}
