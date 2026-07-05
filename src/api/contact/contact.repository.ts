/**
 * Contact message persistence contract and default in memory implementation.
 * Services depend on {@link ContactRepository} (dependency inversion) so a
 * database or transport backed implementation can swap in (ROADMAP 0.3).
 */

import type { ContactMessage, NewContactMessage } from "@/api/contact/contact.model.ts";

/** Persistence contract for contact messages. */
export interface ContactRepository {
  findAll(): Promise<readonly ContactMessage[]>;
  create(data: NewContactMessage): Promise<ContactMessage>;
}

/** In memory {@link ContactRepository} for development and tests. */
export class InMemoryContactRepository implements ContactRepository {
  private readonly messages = new Map<string, ContactMessage>();

  /** @returns Every stored contact message. */
  findAll(): Promise<readonly ContactMessage[]> {
    return Promise.resolve([...this.messages.values()]);
  }

  /** Persists a new contact message and returns it with generated fields. */
  create(data: NewContactMessage): Promise<ContactMessage> {
    const message: ContactMessage = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      message: data.message,
      createdAt: new Date().toISOString(),
    };
    this.messages.set(message.id, message);
    return Promise.resolve(message);
  }
}
