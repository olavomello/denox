/**
 * Product persistence contract and default in memory implementation.
 * Services depend on {@link ProductRepository} (dependency inversion).
 */

import type { NewProduct, Product } from "@/api/products/product.model.ts";

/** Persistence contract for products. */
export interface ProductRepository {
  findAll(): Promise<readonly Product[]>;
  findById(id: string): Promise<Product | null>;
  create(data: NewProduct): Promise<Product>;
}

/** In memory {@link ProductRepository} for development and tests. */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();

  constructor(seed: readonly Product[] = []) {
    for (const product of seed) {
      this.products.set(product.id, product);
    }
  }

  /** @returns Every stored product. */
  findAll(): Promise<readonly Product[]> {
    return Promise.resolve([...this.products.values()]);
  }

  /** @returns The product with the given id, or null. */
  findById(id: string): Promise<Product | null> {
    return Promise.resolve(this.products.get(id) ?? null);
  }

  /** Persists a new product and returns it with generated fields. */
  create(data: NewProduct): Promise<Product> {
    const product: Product = {
      id: crypto.randomUUID(),
      name: data.name,
      price: data.price,
      createdAt: new Date().toISOString(),
    };
    this.products.set(product.id, product);
    return Promise.resolve(product);
  }
}
