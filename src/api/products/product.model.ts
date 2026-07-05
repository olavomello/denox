/**
 * Product entity. Pure data shape (MVC: models represent entities only).
 */

/** A catalog product. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly createdAt: string;
}

/** Data required to create a {@link Product}. */
export interface NewProduct {
  readonly name: string;
  readonly price: number;
}
