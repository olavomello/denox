/**
 * Product entity. Pure data shape (MVC: models represent entities only).
 */

/** A catalog product. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  /** Optional short description shown on the showcase and product view. */
  readonly description?: string;
  /** Uploaded image URLs, served under the public namespace (/uploads/...). */
  readonly images: readonly string[];
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
