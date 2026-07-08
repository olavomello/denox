/**
 * Development seed.
 *
 * Inserts sample data through the same repository factories the application
 * uses, so it works with any configured storage driver. Idempotent: users
 * are skipped when their e-mail already exists.
 *
 * Usage: `deno task seed` (respects STORAGE_DRIVER / KV_PATH).
 */

import { createUserRepository } from "@/api/users/user.routes.ts";
import { createProductRepository } from "@/api/products/product.routes.ts";
import { env } from "@/config/env.ts";
import { logger } from "@/shared/logger.ts";

const users = [
  { name: "Ada Lovelace", email: "ada@example.com" },
  { name: "Alan Turing", email: "alan@example.com" },
] as const;

const products = [
  {
    name: "DenoX Sticker Pack",
    price: 9.9,
    description: "A pack of vinyl stickers featuring the DenoX dino.",
  },
  {
    name: "DenoX T-Shirt",
    price: 49.9,
    description: "Soft cotton tee with the DenoX logo. Production ready by default.",
  },
  {
    name: "DenoX Mug",
    price: 19.9,
    description: "Start the day with a hot deploy.",
  },
] as const;

const userRepository = createUserRepository();
const productRepository = createProductRepository();

let created = 0;

for (const user of users) {
  const existing = await userRepository.findByEmail(user.email);
  if (existing === null) {
    await userRepository.create(user);
    created += 1;
  }
}

const existingProducts = await productRepository.findAll();
if (existingProducts.length === 0) {
  for (const product of products) {
    await productRepository.create(product);
    created += existingProducts.length === 0 ? 1 : 0;
  }
}

logger.info("Seed finished", { driver: env.STORAGE_DRIVER, created });
