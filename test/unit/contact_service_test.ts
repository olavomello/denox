/**
 * Unit tests — contact business rules (src/api/contact/contact.service.ts).
 */

import { assertEquals } from "@std/assert";
import { ContactService } from "@/api/contact/contact.service.ts";
import { MockContactRepository } from "../mocks/contact_repository.mock.ts";

Deno.test("submit persists the message through the repository", async () => {
  const repository = new MockContactRepository();
  const service = new ContactService(repository);

  const stored = await service.submit({
    name: "Ada",
    email: "ada@example.com",
    message: "Hello",
  });

  assertEquals(stored.name, "Ada");
  assertEquals(typeof stored.id, "string");
  assertEquals(repository.calls[0]?.method, "create");
});

Deno.test("list returns every stored message", async () => {
  const service = new ContactService(new MockContactRepository());
  const messages = await service.list();
  assertEquals(messages.length, 0);
});
