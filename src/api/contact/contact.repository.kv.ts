/**
 * Deno KV backed {@link ContactRepository}.
 * Key layout: ["contact", id] → ContactMessage.
 */

import type { ContactMessage, NewContactMessage } from "@/api/contact/contact.model.ts";
import type { ContactRepository } from "@/api/contact/contact.repository.ts";

/** KV implementation of {@link ContactRepository}. */
export class KvContactRepository implements ContactRepository {
  constructor(private readonly kv: Deno.Kv) {}

  /** @returns Every stored contact message. */
  async findAll(): Promise<readonly ContactMessage[]> {
    const messages: ContactMessage[] = [];
    for await (const entry of this.kv.list<ContactMessage>({ prefix: ["contact"] })) {
      messages.push(entry.value);
    }
    return messages;
  }

  /** Persists a new contact message and returns it with generated fields. */
  async create(data: NewContactMessage): Promise<ContactMessage> {
    const message: ContactMessage = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      message: data.message,
      createdAt: new Date().toISOString(),
    };
    await this.kv.set(["contact", message.id], message);
    return message;
  }
}
