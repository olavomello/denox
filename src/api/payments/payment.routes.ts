/**
 * Payments routes — composition root of the payments feature.
 *
 * With payments.provider "none" the endpoints stay registered but answer
 * 501 (mechanism present, feature off — FR-1) and no provider keys are
 * demanded. Enabling stripe makes the keys fail-fast at boot.
 */

import type { Hono } from "hono";
import { PaymentController } from "@/api/payments/payment.controller.ts";
import {
  InMemoryEventLedger,
  InMemoryPaymentRepository,
} from "@/api/payments/payment.repository.ts";
import { KvEventLedger, KvPaymentRepository } from "@/api/payments/payment.repository.kv.ts";
import { PaymentService } from "@/api/payments/payment.service.ts";
import { createPaymentProvider, type PaymentProvider } from "@/api/payments/provider.ts";
import { productService } from "@/api/products/product.routes.ts";
import { env } from "@/config/env.ts";
import { requireAuth, requireRole } from "@/middleware/auth.ts";
import { NotImplementedException } from "@/shared/exceptions/app_exception.ts";
import { requireKv } from "@/shared/storage.ts";

/**
 * Registers the payments feature on the given router.
 *
 * @param app API router.
 */
export function registerPaymentRoutes(app: Hono): void {
  const provider: PaymentProvider | null = createPaymentProvider();

  if (provider === null) {
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

  const repository = env.STORAGE_DRIVER === "kv"
    ? new KvPaymentRepository(requireKv())
    : new InMemoryPaymentRepository();
  const ledger = env.STORAGE_DRIVER === "kv"
    ? new KvEventLedger(requireKv())
    : new InMemoryEventLedger();
  const service = new PaymentService(repository, ledger, provider, productService);
  const controller = new PaymentController(service, provider);

  app.post("/payments/checkout", requireAuth(), controller.checkout);
  app.post("/payments/webhook", controller.webhook);
  app.get("/payments/:id", requireAuth(), controller.show);
  app.get("/payments", requireRole("admin"), controller.index);
}
