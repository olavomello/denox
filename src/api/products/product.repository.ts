/**
 * Product persistence contract and default in memory implementation.
 * Services depend on {@link ProductRepository} (dependency inversion).
 */

import type { NewProduct, Product, ProductPatch } from "@/api/products/product.model.ts";
import { ConflictException } from "@/shared/exceptions/app_exception.ts";
import { slugCandidate, slugify } from "@/shared/slug.ts";

/** Persistence contract for products. */
export interface ProductRepository {
  findAll(): Promise<readonly Product[]>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  create(data: NewProduct): Promise<Product>;
  update(id: string, patch: ProductPatch): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}

/** In memory {@link ProductRepository} for development and tests. */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();
  /** slug → product id (stale slugs stay mapped for 301 redirects). */
  private readonly slugIndex = new Map<string, string>();

  /** Claims the first free collision-suffixed slug for a product id. */
  private claimSlug(name: string, id: string): string {
    const base = slugify(name, id.slice(0, 8));
    for (let attempt = 1;; attempt++) {
      const candidate = slugCandidate(base, attempt);
      if (!this.slugIndex.has(candidate)) {
        this.slugIndex.set(candidate, id);
        return candidate;
      }
    }
  }

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

  /** @returns The product mapped to the slug (current or stale), or null. */
  findBySlug(slug: string): Promise<Product | null> {
    const id = this.slugIndex.get(slug);
    return Promise.resolve(id === undefined ? null : this.products.get(id) ?? null);
  }

  /** Persists a new product and returns it with generated fields. */
  create(data: NewProduct): Promise<Product> {
    const id = crypto.randomUUID();
    const product: Product = {
      id,
      ...data,
      slug: this.claimSlug(data.name, id),
      images: [],
      createdAt: new Date().toISOString(),
    };
    this.products.set(product.id, product);
    return Promise.resolve(product);
  }

  /** Applies a partial update; @returns the updated product or null. */
  update(id: string, patch: ProductPatch): Promise<Product | null> {
    const existing = this.products.get(id);
    if (existing === undefined) return Promise.resolve(null);
    if (patch.slug !== undefined && patch.slug !== existing.slug) {
      const owner = this.slugIndex.get(patch.slug);
      if (owner !== undefined && owner !== id) {
        return Promise.reject(
          new ConflictException(`Slug "${patch.slug}" is already in use`),
        );
      }
      this.slugIndex.set(patch.slug, id);
      // The previous slug stays mapped for 301 redirects.
    }
    const updated: Product = { ...existing, ...patch };
    this.products.set(id, updated);
    return Promise.resolve(updated);
  }

  /** Removes a product; @returns whether it existed. */
  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.products.delete(id));
  }
}
