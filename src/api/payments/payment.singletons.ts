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
import { requireKv, requirePool } from "@/shared/storage.ts";
import {
  PostgresEventLedger,
  PostgresPaymentRepository,
} from "@/api/payments/payment.repository.postgres.ts";

/** @returns The payment repository for the configured driver. */
function createPaymentRepository() {
  switch (env.STORAGE_DRIVER) {
    case "postgres":
      return new PostgresPaymentRepository(requirePool());
    case "kv":
      return new KvPaymentRepository(requireKv());
    default:
      return new InMemoryPaymentRepository();
  }
}

/** @returns The event ledger for the configured driver. */
function createEventLedger() {
  switch (env.STORAGE_DRIVER) {
    case "postgres":
      return new PostgresEventLedger(requirePool());
    case "kv":
      return new KvEventLedger(requireKv());
    default:
      return new InMemoryEventLedger();
  }
}

/** Configured provider, or null when payments are disabled. */
export const paymentProvider: PaymentProvider | null = createPaymentProvider();

/** Shared service, or null when payments are disabled. */
export const paymentService: PaymentService | null = paymentProvider === null
  ? null
  : new PaymentService(
    createPaymentRepository(),
    createEventLedger(),
    paymentProvider,
    productService,
  );
