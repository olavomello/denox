/**
 * Contact routes — composition root of the contact feature.
 *
 * Wires repository → service → controller and registers the HTTP routes.
 * The composed service is exported so the no-JS frontend fallback route
 * (`POST /contact`) reuses the same store — a documented deviation from the
 * users/products slices required to keep a single in-memory instance.
 */

import type { Hono } from "hono";
import { ContactController } from "@/api/contact/contact.controller.ts";
import type { ContactRepository } from "@/api/contact/contact.repository.ts";
import { InMemoryContactRepository } from "@/api/contact/contact.repository.ts";
import { KvContactRepository } from "@/api/contact/contact.repository.kv.ts";
import { ContactService } from "@/api/contact/contact.service.ts";
import { env } from "@/config/env.ts";
import { requireKv } from "@/shared/storage.ts";

/**
 * Chooses the {@link ContactRepository} implementation for the configured
 * storage driver.
 *
 * @returns Repository instance.
 */
export function createContactRepository(): ContactRepository {
  return env.STORAGE_DRIVER === "kv"
    ? new KvContactRepository(requireKv())
    : new InMemoryContactRepository();
}

/** Shared contact service instance (API + no-JS frontend fallback). */
export const contactService: ContactService = new ContactService(
  createContactRepository(),
);

/**
 * Registers the contact feature on the given router.
 *
 * @param app API router.
 */
export function registerContactRoutes(app: Hono): void {
  const controller = new ContactController(contactService);
  app.post("/contact", controller.store);
}
