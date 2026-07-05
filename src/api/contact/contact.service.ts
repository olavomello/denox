/**
 * Contact business rules. No HTTP, no HTML, no routing. Dependencies are
 * injected through the constructor for testability.
 */

import type { CreateContactDto } from "@/api/contact/contact.dto.ts";
import type { ContactMessage } from "@/api/contact/contact.model.ts";
import type { ContactRepository } from "@/api/contact/contact.repository.ts";

/** Application service for the contact feature. */
export class ContactService {
  constructor(private readonly repository: ContactRepository) {}

  /**
   * Stores a submitted contact message.
   *
   * @param dto Validated contact data.
   * @returns Stored message.
   */
  submit(dto: CreateContactDto): Promise<ContactMessage> {
    return this.repository.create(dto);
  }

  /**
   * Lists every stored contact message.
   *
   * @returns All messages.
   */
  list(): Promise<readonly ContactMessage[]> {
    return this.repository.findAll();
  }
}
