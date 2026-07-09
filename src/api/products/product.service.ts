/**
 * Product business rules. No HTTP, no HTML, no routing. Dependencies are
 * injected through the constructor for testability.
 */

import type { CreateProductDto, UpdateProductDto } from "@/api/products/product.dto.ts";
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
   * Applies a partial update to a product's details.
   *
   * @param id Product identifier.
   * @param patch Validated partial fields.
   * @returns Updated product.
   * @throws {NotFoundException} When the product does not exist.
   */
  async updateDetails(id: string, patch: UpdateProductDto): Promise<Product> {
    const product = await this.getById(id);
    const updated = await this.repository.update(product.id, patch);
    return updated ?? product;
  }

  /**
   * Attaches one or more uploaded images to a product. Each file's format is
   * detected from magic bytes (client type/filename untrusted); every valid
   * image is stored under the public uploads namespace and appended to the
   * product's `images` list.
   *
   * @param id Product identifier.
   * @param files Raw uploaded files.
   * @returns Updated product.
   * @throws {NotFoundException} When the product does not exist.
   * @throws {ValidationException} When no file is a supported image or any
   * exceeds {@link IMAGE_MAX_BYTES}.
   */
  async attachImages(id: string, files: readonly Uint8Array[]): Promise<Product> {
    const product = await this.getById(id);

    if (files.length === 0) {
      throw new ValidationException("Invalid image upload", {
        fields: { image: "at least one image file is required" },
      });
    }

    const urls: string[] = [];
    for (const bytes of files) {
      if (bytes.length === 0 || bytes.length > IMAGE_MAX_BYTES) {
        throw new ValidationException("Invalid image upload", {
          fields: { image: `each image must be between 1 byte and ${IMAGE_MAX_BYTES} bytes` },
        });
      }
      const contentType = sniffImageType(bytes);
      if (contentType === null) {
        throw new ValidationException("Invalid image upload", {
          fields: { image: "images must be PNG, JPEG or WebP files" },
        });
      }
      const extension = contentType === "image/png"
        ? "png"
        : contentType === "image/jpeg"
        ? "jpg"
        : "webp";
      const imageId = `${crypto.randomUUID()}.${extension}`;
      await this.blobStorage.put(`products/${product.id}/${imageId}`, { contentType, bytes });
      urls.push(`/uploads/products/${product.id}/${imageId}`);
    }

    const updated = await this.repository.update(product.id, {
      images: [...product.images, ...urls],
    });
    return updated ?? product;
  }

  /**
   * Removes one image from a product (blob and list entry).
   *
   * @param id Product identifier.
   * @param imageId Image file name (as served under /uploads).
   * @returns Updated product.
   * @throws {NotFoundException} When the product or the image is missing.
   */
  async removeImage(id: string, imageId: string): Promise<Product> {
    const product = await this.getById(id);
    const url = `/uploads/products/${product.id}/${imageId}`;
    if (!product.images.includes(url)) {
      throw new NotFoundException(`Image "${imageId}" not found on product "${id}"`);
    }
    await this.blobStorage.delete(`products/${product.id}/${imageId}`);
    const updated = await this.repository.update(product.id, {
      images: product.images.filter((image) => image !== url),
    });
    return updated ?? product;
  }

  /**
   * Deletes a product and every image blob attached to it.
   *
   * @param id Product identifier.
   * @throws {NotFoundException} When the product does not exist.
   */
  async remove(id: string): Promise<void> {
    const product = await this.getById(id);
    for (const url of product.images) {
      const imageId = url.split("/").pop() ?? "";
      await this.blobStorage.delete(`products/${product.id}/${imageId}`);
    }
    // Legacy single-image revision stored the blob without an imageId.
    await this.blobStorage.delete(`products/${product.id}`);
    await this.repository.delete(product.id);
  }

  /**
   * Fetches a stored image blob for public serving.
   *
   * @param id Product identifier.
   * @param imageId Image file name.
   * @returns The blob.
   * @throws {NotFoundException} When the image is missing.
   */
  async getImage(id: string, imageId: string): Promise<Blob> {
    const blob = await this.blobStorage.get(`products/${id}/${imageId}`);
    if (blob === null) {
      throw new NotFoundException(`Image "${imageId}" not found`);
    }
    return blob;
  }
}
