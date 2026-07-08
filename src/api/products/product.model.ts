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
  /** Optional image path (same-origin, e.g. /images/products/x.png — CSP). */
  readonly imageUrl?: string;
  readonly createdAt: string;
}

/** Data required to create a {@link Product}. */
export interface NewProduct {
  readonly name: string;
  readonly price: number;
  readonly description?: string;
  readonly imageUrl?: string;
}
