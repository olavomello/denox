/**
 * Deno KV backed {@link ProductRepository}.
 * Key layout: ["products", id] → Product.
 */

import type { NewProduct, Product, ProductPatch } from "@/api/products/product.model.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";
import { ConflictException } from "@/shared/exceptions/app_exception.ts";
import { slugCandidate, slugify } from "@/shared/slug.ts";

/** Shape of records persisted before the multi-image/slug revisions. */
type StoredProduct = Omit<Product, "images" | "slug"> & {
  readonly images?: readonly string[];
  readonly slug?: string;
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
    return { ...rest, slug: stored.slug ?? "", images: stored.images ?? [] };
  }

  /**
   * Claims the first free collision-suffixed slug atomically (index key
   * ["product_slugs", slug] → id — same transaction pattern as the users
   * e-mail index) and returns it. When `record` is provided, the product
   * record is persisted in the same transaction.
   */
  private async claimSlug(name: string, id: string, record?: Product): Promise<string> {
    const base = slugify(name, id.slice(0, 8));
    for (let attempt = 1;; attempt++) {
      const candidate = slugCandidate(base, attempt);
      let tx = this.kv.atomic()
        .check({ key: ["product_slugs", candidate], versionstamp: null })
        .set(["product_slugs", candidate], id);
      if (record !== undefined) {
        tx = tx.set(["products", id], { ...record, slug: candidate });
      }
      const result = await tx.commit();
      if (result.ok) return candidate;
    }
  }

  /**
   * Lazy migration: products persisted before the slug revision get one
   * materialized (atomically, collision-suffixed) on first read.
   */
  private async materialize(stored: StoredProduct): Promise<Product> {
    const hydrated = this.hydrate(stored);
    if (hydrated.slug !== "") return hydrated;
    const slug = await this.claimSlug(hydrated.name, hydrated.id, hydrated);
    return { ...hydrated, slug };
  }

  /** @returns Every stored product. */
  async findAll(): Promise<readonly Product[]> {
    const products: Product[] = [];
    for await (const entry of this.kv.list<StoredProduct>({ prefix: ["products"] })) {
      products.push(await this.materialize(entry.value));
    }
    return products;
  }

  /** @returns The product with the given id, or null. */
  async findById(id: string): Promise<Product | null> {
    const entry = await this.kv.get<StoredProduct>(["products", id]);
    return entry.value === null ? null : await this.materialize(entry.value);
  }

  /** @returns The product mapped to the slug (current or stale), or null. */
  async findBySlug(slug: string): Promise<Product | null> {
    const index = await this.kv.get<string>(["product_slugs", slug]);
    if (index.value === null) return null;
    return await this.findById(index.value);
  }

  /** Persists a new product and returns it with generated fields. */
  async create(data: NewProduct): Promise<Product> {
    const id = crypto.randomUUID();
    const draft: Product = {
      id,
      ...data,
      slug: "",
      images: [],
      createdAt: new Date().toISOString(),
    };
    const slug = await this.claimSlug(data.name, id, draft);
    return { ...draft, slug };
  }

  /** Applies a partial update; @returns the updated product or null. */
  async update(id: string, patch: ProductPatch): Promise<Product | null> {
    const existing = await this.findById(id);
    if (existing === null) return null;
    if (patch.slug !== undefined && patch.slug !== existing.slug) {
      const result = await this.kv.atomic()
        .check({ key: ["product_slugs", patch.slug], versionstamp: null })
        .set(["product_slugs", patch.slug], id)
        .set(["products", id], { ...existing, ...patch })
        .commit();
      if (!result.ok) {
        const owner = await this.kv.get<string>(["product_slugs", patch.slug]);
        if (owner.value !== id) {
          throw new ConflictException(`Slug "${patch.slug}" is already in use`);
        }
        // Re-claiming a stale slug we already own: plain write below.
      } else {
        return { ...existing, ...patch };
      }
    }
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
