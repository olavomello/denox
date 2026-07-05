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
import { InMemoryContactRepository } from "@/api/contact/contact.repository.ts";
import { ContactService } from "@/api/contact/contact.service.ts";

/** Shared contact service instance (API + no-JS frontend fallback). */
export const contactService: ContactService = new ContactService(
  new InMemoryContactRepository(),
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
