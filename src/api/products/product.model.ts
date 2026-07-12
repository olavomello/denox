/**
 * Product entity. Pure data shape (MVC: models represent entities only).
 */

/** A catalog product. */
/** An uploaded product image with layout/SEO metadata. */
export interface ProductImage {
  readonly url: string;
  /** Pixel dimensions (0 when unknown — legacy records). */
  readonly width: number;
  readonly height: number;
  /** Alt text override; empty string means "derive from product name". */
  readonly alt: string;
}

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  /** Unique URL slug (page address: /products/<slug>). */
  readonly slug: string;
  /** Optional short description shown on the showcase and product view. */
  readonly description?: string;
  /** Uploaded images with their metadata (served under /uploads/...). */
  readonly images: readonly ProductImage[];
  readonly createdAt: string;
}

/** Data required to create a {@link Product}. */
export interface NewProduct {
  readonly name: string;
  readonly price: number;
  readonly description?: string;
}

/** Fields a repository update may patch. */
export type ProductPatch = Partial<Omit<Product, "id" | "createdAt">>;
