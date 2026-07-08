/**
 * Product business rules. No HTTP, no HTML, no routing. Dependencies are
 * injected through the constructor for testability.
 */

import type { CreateProductDto } from "@/api/products/product.dto.ts";
import type { Product } from "@/api/products/product.model.ts";
import type { ProductRepository } from "@/api/products/product.repository.ts";
import type { Blob, BlobStorage } from "@/shared/blob_storage.ts";
import { NotFoundException, ValidationException } from "@/shared/exceptions/app_exception.ts";
import { IMAGE_MAX_BYTES, sniffImageType } from "@/shared/images.ts";

/** Application service for the products feature. */
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly blobStorage: BlobStorage,
  ) {}

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

  /**
   * Attaches an uploaded image to a product. The format is detected from
   * magic bytes (client type/filename untrusted) and the product's
   * `imageUrl` is pointed at the serving endpoint.
   *
   * @param id Product identifier.
   * @param bytes Raw uploaded bytes.
   * @returns Updated product.
   * @throws {NotFoundException} When the product does not exist.
   * @throws {ValidationException} When the file is not a supported image or
   * exceeds {@link IMAGE_MAX_BYTES}.
   */
  async attachImage(id: string, bytes: Uint8Array): Promise<Product> {
    const product = await this.getById(id);

    if (bytes.length === 0 || bytes.length > IMAGE_MAX_BYTES) {
      throw new ValidationException("Invalid image upload", {
        fields: { image: `image must be between 1 byte and ${IMAGE_MAX_BYTES} bytes` },
      });
    }
    const contentType = sniffImageType(bytes);
    if (contentType === null) {
      throw new ValidationException("Invalid image upload", {
        fields: { image: "image must be a PNG, JPEG or WebP file" },
      });
    }

    await this.blobStorage.put(`products/${product.id}`, { contentType, bytes });
    const updated = await this.repository.update(product.id, {
      imageUrl: `/api/products/${product.id}/image`,
    });
    return updated ?? product;
  }

  /**
   * Fetches the stored image blob for a product.
   *
   * @param id Product identifier.
   * @returns The blob.
   * @throws {NotFoundException} When the product or its image is missing.
   */
  async getImage(id: string): Promise<Blob> {
    const blob = await this.blobStorage.get(`products/${id}`);
    if (blob === null) {
      throw new NotFoundException(`Product "${id}" has no image`);
    }
    return blob;
  }
}
