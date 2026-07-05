/**
 * Product business rules. No HTTP, no HTML, no routing. Dependencies are
 * injected through the constructor for testability.
 */

import type { CreateProductDto } from "@/api/products/product.dto.ts";
import type { Product } from "@/api/products/product.model.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";
import { NotFoundException } from "@/shared/exceptions/app_exception.ts";

/** Application service for the products feature. */
export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  /**
   * Lists every product.
   *
   * @returns All products.
   */
  list(): Promise<readonly Product[]> {
    return this.repository.findAll();
  }

  /**
   * Finds a product by id.
   *
   * @param id Product identifier.
   * @returns The product.
   * @throws {NotFoundException} When no product has the given id.
   */
  async getById(id: string): Promise<Product> {
    const product = await this.repository.findById(id);
    if (product === null) {
      throw new NotFoundException(`Product "${id}" not found`);
    }
    return product;
  }

  /**
   * Creates a new product.
   *
   * @param dto Validated product creation data.
   * @returns Created product.
   */
  create(dto: CreateProductDto): Promise<Product> {
    return this.repository.create(dto);
  }
}
