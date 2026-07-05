/**
 * Contact message entity. Pure data shape (MVC: models represent entities
 * only).
 */

/** A received contact message. */
export interface ContactMessage {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly createdAt: string;
}

/** Data required to create a {@link ContactMessage}. */
export interface NewContactMessage {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}
