/**
 * Unit tests — user business rules (src/api/users/user.service.ts).
 * Uses MockUserRepository: no HTTP, no real persistence.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { UserService } from "@/api/users/user.service.ts";
import { ConflictException, NotFoundException } from "@/shared/exceptions/app_exception.ts";
import { userFixtures } from "../fixtures/users.ts";
import { MockUserRepository } from "../mocks/user_repository.mock.ts";

Deno.test("list returns every user from the repository", async () => {
  const repository = new MockUserRepository(userFixtures);
  const service = new UserService(repository);

  const users = await service.list();

  assertEquals(users.length, 2);
  assertEquals(repository.calls[0]?.method, "findAll");
});

Deno.test("getById returns the matching user", async () => {
  const service = new UserService(new MockUserRepository(userFixtures));
  const user = await service.getById(userFixtures[0]!.id);
  assertEquals(user.email, "ada@example.com");
});

Deno.test("getById throws NotFoundException for unknown ids", async () => {
  const service = new UserService(new MockUserRepository(userFixtures));
  await assertRejects(() => service.getById("missing"), NotFoundException);
});

Deno.test("create persists a user with a fresh email", async () => {
  const repository = new MockUserRepository(userFixtures);
  const service = new UserService(repository);

  const user = await service.create({ name: "Grace", email: "grace@example.com" });

  assertEquals(user.name, "Grace");
  assertEquals(repository.calls.map((call) => call.method), ["findByEmail", "create"]);
});

Deno.test("create throws ConflictException for duplicate emails", async () => {
  const service = new UserService(new MockUserRepository(userFixtures));
  await assertRejects(
    () => service.create({ name: "Clone", email: "ada@example.com" }),
    ConflictException,
  );
});
