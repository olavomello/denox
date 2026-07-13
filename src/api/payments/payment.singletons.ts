/**
 * Shared payments singletons — the seam that lets both the API routes and
 * the frontend buy flow reach one service instance (users/auth pattern).
 *
 * Both exports are null while payments.provider is "none": consumers gate
 * their registration on that, keeping disabled deployments inert.
 */

import {
  InMemoryEventLedger,
  InMemoryPaymentRepository,
} from "@/api/payments/payment.repository.ts";
import { KvEventLedger, KvPaymentRepository } from "@/api/payments/payment.repository.kv.ts";
import { PaymentService } from "@/api/payments/payment.service.ts";
import { createPaymentProvider, type PaymentProvider } from "@/api/payments/provider.ts";
import { productService } from "@/api/products/product.routes.ts";
import { env } from "@/config/env.ts";
import { requireKv } from "@/shared/storage.ts";

/** Configured provider, or null when payments are disabled. */
export const paymentProvider: PaymentProvider | null = createPaymentProvider();

/** Shared service, or null when payments are disabled. */
export const paymentService: PaymentService | null = paymentProvider === null
  ? null
  : new PaymentService(
    env.STORAGE_DRIVER === "kv"
      ? new KvPaymentRepository(requireKv())
      : new InMemoryPaymentRepository(),
    env.STORAGE_DRIVER === "kv" ? new KvEventLedger(requireKv()) : new InMemoryEventLedger(),
    paymentProvider,
    productService,
  );
