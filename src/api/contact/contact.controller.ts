/**
 * Contact HTTP controller. Receives requests, validates input, calls the
 * service and shapes the response envelope — nothing else.
 */

import type { Context } from "hono";
import { parseCreateContactDto } from "@/api/contact/contact.dto.ts";
import type { ContactService } from "@/api/contact/contact.service.ts";
import { BadRequestException } from "@/shared/exceptions/app_exception.ts";
import { ok } from "@/shared/http.ts";

/** HTTP adapter for the contact feature. */
export class ContactController {
  constructor(private readonly service: ContactService) {}

  /**
   * `POST /api/contact` — stores a contact message.
   *
   * @param c Request context.
   * @returns 201 with the stored message.
   */
  store = async (c: Context): Promise<Response> => {
    const body: unknown = await c.req.json().catch(() => {
      throw new BadRequestException("Request body must be valid JSON");
    });
    const dto = parseCreateContactDto(body);
    const message = await this.service.submit(dto);
    return c.json(ok(message), 201);
  };
}
