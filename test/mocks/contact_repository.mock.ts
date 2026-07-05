/**
 * Mock ContactRepository for unit tests. Records calls and echoes payloads
 * back with deterministic generated fields.
 */

import type { ContactMessage, NewContactMessage } from "@/api/contact/contact.model.ts";
import type { ContactRepository } from "@/api/contact/contact.repository.ts";

/** Call-recording mock of {@link ContactRepository}. */
export class MockContactRepository implements ContactRepository {
  readonly calls: { method: string; args: unknown[] }[] = [];

  constructor(private readonly messages: readonly ContactMessage[] = []) {}

  /** @returns The scripted message list. */
  findAll(): Promise<readonly ContactMessage[]> {
    this.calls.push({ method: "findAll", args: [] });
    return Promise.resolve(this.messages);
  }

  /** Echoes the payload back as a stored message. */
  create(data: NewContactMessage): Promise<ContactMessage> {
    this.calls.push({ method: "create", args: [data] });
    return Promise.resolve({
      id: "44444444-4444-4444-8444-444444444444",
      ...data,
      createdAt: "2026-01-04T00:00:00.000Z",
    });
  }
}
