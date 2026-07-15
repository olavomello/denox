/**
 * Postgres {@link ProductRepository}. Slug/SKU uniqueness are native
 * constraints; product_slugs keeps stale slugs mapped for 301s; images
 * ride in a JSONB column so the domain model is unchanged.
 */

import type { Pool, PoolClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import type {
  NewProduct,
  Product,
  ProductImage,
  ProductPatch,
} from "@/api/products/product.model.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";
import { ConflictException } from "@/shared/exceptions/app_exception.ts";
import { slugCandidate, slugify } from "@/shared/slug.ts";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  price: string;
  description: string | null;
  images: ProductImage[];
  created_at: Date;
}

/** @returns Domain product from a row. */
function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ...(row.sku !== null ? { sku: row.sku } : {}),
    price: Number(row.price),
    ...(row.description !== null ? { description: row.description } : {}),
    images: row.images ?? [],
    createdAt: row.created_at.toISOString(),
  };
}

/** Postgres-backed product store. */
export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool) {}

  /** @returns Every product. */
  async findAll(): Promise<readonly Product[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<ProductRow>(
        "SELECT * FROM products ORDER BY created_at",
      );
      return result.rows.map(toProduct);
    } finally {
      client.release();
    }
  }

  /** @returns The product with the given id, or null. */
  async findById(id: string): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<ProductRow>(
        "SELECT * FROM products WHERE id = $1",
        [id],
      );
      return result.rows[0] ? toProduct(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /** @returns The product mapped to the slug (current or stale), or null. */
  async findBySlug(slug: string): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<ProductRow>(
        `SELECT p.* FROM products p
         JOIN product_slugs s ON s.product_id = p.id
         WHERE s.slug = $1`,
        [slug],
      );
      return result.rows[0] ? toProduct(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /** Reserves a unique slug from the product name. */
  private async claimSlug(client: PoolClient, name: string): Promise<string> {
    const base = slugify(name);
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = slugCandidate(base, attempt);
      const existing = await client.queryObject(
        "SELECT 1 FROM product_slugs WHERE slug = $1",
        [candidate],
      );
      if (existing.rows.length === 0) return candidate;
    }
    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
  }

  /** Creates a product (slug/sku uniqueness enforced by the DB). */
  async create(data: NewProduct): Promise<Product> {
    const client = await this.pool.connect();
    try {
      const id = crypto.randomUUID();
      const slug = await this.claimSlug(client, data.name);
      const product: Product = {
        id,
        name: data.name,
        slug,
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        price: data.price,
        ...(data.description !== undefined ? { description: data.description } : {}),
        images: [],
        createdAt: new Date().toISOString(),
      };
      const tx = client.createTransaction(`create_product_${id.replace(/\W/g, "")}`);
      await tx.begin();
      try {
        await tx.queryObject(
          `INSERT INTO products (id, name, slug, sku, price, description, images, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            id,
            product.name,
            slug,
            product.sku ?? null,
            product.price,
            product.description ?? null,
            JSON.stringify(product.images),
            product.createdAt,
          ],
        );
        await tx.queryObject(
          "INSERT INTO product_slugs (slug, product_id) VALUES ($1, $2)",
          [slug, id],
        );
        await tx.commit();
      } catch (error) {
        await tx.rollback().catch(() => {});
        if (String(error).includes("products_sku_key")) {
          throw new ConflictException(`SKU "${data.sku}" is already in use`);
        }
        throw error;
      }
      return product;
    } finally {
      client.release();
    }
  }

  /** Applies a partial update; @returns the updated product or null. */
  async update(id: string, patch: ProductPatch): Promise<Product | null> {
    const client = await this.pool.connect();
    try {
      const current = await this.findById(id);
      if (current === null) return null;

      if (patch.sku !== undefined && patch.sku !== current.sku && patch.sku !== "") {
        const taken = await client.queryObject(
          "SELECT 1 FROM products WHERE sku = $1 AND id <> $2",
          [patch.sku, id],
        );
        if (taken.rows.length > 0) {
          throw new ConflictException(`SKU "${patch.sku}" is already in use`);
        }
      }
      const merged: Product = { ...current, ...patch };
      if (patch.sku === "") delete (merged as { sku?: string }).sku;

      await client.queryObject(
        `UPDATE products SET name = $2, price = $3, description = $4, sku = $5, images = $6
         WHERE id = $1`,
        [
          id,
          merged.name,
          merged.price,
          merged.description ?? null,
          merged.sku ?? null,
          JSON.stringify(merged.images),
        ],
      );
      return merged;
    } finally {
      client.release();
    }
  }

  /** Removes a product; @returns whether it existed. */
  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject("DELETE FROM products WHERE id = $1", [id]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
}
