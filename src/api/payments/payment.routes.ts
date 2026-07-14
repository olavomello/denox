/**
 * Payments routes — composition root of the payments feature.
 *
 * With payments.provider "none" the endpoints stay registered but answer
 * 501 (mechanism present, feature off — FR-1) and no provider keys are
 * demanded. Enabling stripe makes the keys fail-fast at boot.
 */

import type { Hono } from "hono";
import { PaymentController } from "@/api/payments/payment.controller.ts";
import { paymentProvider, paymentService } from "@/api/payments/payment.singletons.ts";
import { requireAuth, requireRole } from "@/middleware/auth.ts";
import { NotImplementedException } from "@/shared/exceptions/app_exception.ts";

/**
 * Registers the payments feature on the given router.
 *
 * @param app API router.
 */
export function registerPaymentRoutes(app: Hono): void {
  if (paymentProvider === null || paymentService === null) {
    const disabled = () => {
      throw new NotImplementedException(
        'Payments are disabled (payments.provider is "none" in denox.config.ts)',
      );
    };
    app.post("/payments/checkout", disabled);
    app.post("/payments/webhook", disabled);
    app.get("/payments/:id", disabled);
    app.get("/payments", disabled);
    return;
  }

  const controller = new PaymentController(paymentService, paymentProvider);

  app.post("/payments/checkout", requireAuth(), controller.checkout);
  app.post("/payments/webhook", controller.webhook);
  app.get("/payments/:id", requireAuth(), controller.show);
  app.get("/payments", requireRole("admin"), controller.index);
}

import {
  errorResponse,
  jsonBody,
  okResponse,
  pathParam,
  registerOpenApiPaths,
  userSecurity,
} from "@/shared/openapi.ts";

registerOpenApiPaths({
  "/api/payments/checkout": {
    post: {
      operationId: "createCheckout",
      summary: "Checkout",
      "x-denox-sort": 1,
      description:
        'Exactly ONE mode: { productId } (amount comes exclusively from the stored price; a product snapshot is persisted) or { amountCents, currency?, description? }. Redirect the buyer to the returned url. Answers 501 while payments.provider is "none".',
      tags: ["Payments"],
      security: [...userSecurity],
      requestBody: jsonBody({
        oneOf: [
          {
            type: "object",
            properties: {
              productId: { type: "string" },
              metadata: { type: "object", additionalProperties: { type: "string" } },
            },
            required: ["productId"],
          },
          {
            type: "object",
            properties: {
              amountCents: { type: "integer", minimum: 1 },
              currency: { type: "string", pattern: "^[a-z]{3}$" },
              description: { type: "string", maxLength: 200 },
              metadata: { type: "object", additionalProperties: { type: "string" } },
            },
            required: ["amountCents"],
          },
        ],
        example: { productId: "<product-uuid>" },
      }),
      "x-denox-examples": [
        { name: "product", body: { productId: "{{ _.product_id }}" } },
        {
          name: "custom amount",
          body: { amountCents: 1990, currency: "usd", description: "Consulting hour" },
        },
      ],
      responses: {
        "201": okResponse("Checkout created", {
          type: "object",
          properties: {
            paymentId: { type: "string" },
            status: { type: "string" },
            url: { type: "string" },
          },
        }),
        "400": errorResponse("Validation error"),
        "401": errorResponse("No session"),
        "404": errorResponse("Unknown product"),
        "501": errorResponse("Payments disabled (provider none)"),
      },
    },
  },
  "/api/payments/webhook": {
    post: {
      operationId: "paymentWebhook",
      summary: "Stripe webhook",
      "x-denox-sort": 4,
      description:
        "Called BY the provider — signature verified on the raw body (Stripe-Signature) before parsing; idempotent by event id (24h ledger). Use the Stripe CLI locally; manual calls get 400.",
      tags: ["Payments"],
      requestBody: jsonBody({ type: "object", description: "Provider event (raw)" }),
      responses: {
        "200": okResponse("Acknowledged (also for replays/unknown session ids)", {
          type: "object",
          properties: { received: { type: "boolean" } },
        }),
        "400": errorResponse("Invalid/stale signature"),
        "501": errorResponse("Payments disabled (provider none)"),
      },
    },
  },
  "/api/payments/{id}": {
    get: {
      operationId: "getPayment",
      summary: "Get payment",
      description: "Owner or admin.",
      "x-denox-sort": 2,
      tags: ["Payments"],
      security: [...userSecurity],
      parameters: [pathParam("id", "Payment id", { type: "string", format: "uuid" })],
      responses: {
        "200": okResponse("The payment", { $ref: "#/components/schemas/Payment" }),
        "401": errorResponse("No session"),
        "403": errorResponse("Another user's payment"),
        "404": errorResponse("Unknown payment"),
        "501": errorResponse("Payments disabled (provider none)"),
      },
    },
  },
  "/api/payments": {
    get: {
      operationId: "listPayments",
      summary: "List payments",
      "x-denox-sort": 3,
      tags: ["Payments"],
      security: [...userSecurity],
      "x-denox-role": "admin",
      responses: {
        "200": okResponse("Every payment, newest first", {
          type: "array",
          items: { $ref: "#/components/schemas/Payment" },
        }),
        "401": errorResponse("No session"),
        "403": errorResponse("Not an admin"),
        "501": errorResponse("Payments disabled (provider none)"),
      },
    },
  },
});
