/**
 * Payments controller — HTTP adapter.
 *
 * The webhook handler reads the RAW body and hands it to the provider for
 * signature verification BEFORE any JSON parsing (NFR-2).
 */

import type { Context } from "hono";
import { parseCheckoutDto } from "@/api/payments/payment.dto.ts";
import type { PaymentService } from "@/api/payments/payment.service.ts";
import type { PaymentProvider } from "@/api/payments/provider.ts";
import type { User } from "@/api/users/user.model.ts";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/shared/exceptions/app_exception.ts";
import { ok } from "@/shared/http.ts";

/** HTTP layer of the payments feature. */
export class PaymentController {
  constructor(
    private readonly service: PaymentService,
    private readonly provider: PaymentProvider,
  ) {}

  /** Reads the stashed authenticated user. */
  private user(c: Context): User {
    return (c as unknown as { get(key: string): unknown }).get("authUser") as User;
  }

  /**
   * `POST /api/payments/checkout` — creates a hosted checkout.
   *
   * @param c Request context.
   * @returns 201 with { paymentId, status, url }.
   */
  checkout = async (c: Context): Promise<Response> => {
    const body = await c.req.json().catch(() => {
      throw new BadRequestException("Request body must be valid JSON");
    });
    const dto = parseCheckoutDto(body);
    const result = await this.service.checkout(this.user(c).id, dto);
    return c.json(ok(result), 201);
  };

  /**
   * `POST /api/payments/webhook` — verified provider callbacks.
   *
   * @param c Request context.
   * @returns 200 (also for replays/unknown ids — no information leakage).
   */
  webhook = async (c: Context): Promise<Response> => {
    const rawBody = await c.req.text();
    const signature = c.req.header("stripe-signature") ??
      c.req.header("x-webhook-signature") ?? "";
    const event = await this.provider.parseWebhook(rawBody, signature);
    await this.service.applyWebhook(event);
    return c.json(ok({ received: true }), 200);
  };

  /**
   * `GET /api/payments/:id` — owner or admin.
   *
   * @param c Request context.
   * @returns 200 with the payment.
   */
  show = async (c: Context): Promise<Response> => {
    const payment = await this.service.getById(c.req.param("id") ?? "");
    if (payment === null) throw new NotFoundException("Payment not found");
    const user = this.user(c);
    if (payment.userId !== user.id && user.role !== "admin") {
      throw new ForbiddenException();
    }
    return c.json(ok(payment));
  };

  /**
   * `GET /api/payments` — admin listing.
   *
   * @param c Request context.
   * @returns 200 with every payment.
   */
  index = async (c: Context): Promise<Response> => {
    return c.json(ok(await this.service.list()));
  };
}
