---
feature: product-sku
status: draft
author: olavomello
reviewed_by:
date: 2026-07-12
---

# Product SKU — Specification (0.8.x)

## Objective

Deliver the item deferred from the 0.7 payments spec: an optional `sku` field on products — **unique
when present** (a SKU that isn't unique isn't a SKU) — carried into the payment `productSnapshot` so
purchase records identify exactly what was sold, immune to later edits.

## Scope

### In scope

1. **Model** — `Product.sku?: string` (optional: not every catalog uses SKUs). Format: trimmed, 1–64
   chars, `^[A-Za-z0-9._-]+$` (case preserved, matching real-world SKU conventions).
2. **Uniqueness when present** — sparse index, same discipline as slug/e-mail: memory map / atomic
   KV index `["product_skus", sku]`; creating or patching to a taken SKU → **409**. Clearing is
   allowed (PATCH `sku: ""` removes it and frees the index); changing releases the old entry (SKUs
   are operational identifiers, not URLs — no 301 semantics).
3. **DTOs** — `sku` accepted on create and on both PATCH modes (JSON and multipart), validated;
   legacy records simply lack the field (no migration needed — optionality is the hydration).
4. **Snapshot** — `productSnapshot` gains `sku?`, populated at checkout when the product has one
   (both the API checkout and the buy-button flow, which share the service path).
5. **Display** — muted `SKU: <value>` line on the product view when present.
6. **Contract** — OpenAPI schemas updated (Product, ProductSnapshot, create/patch bodies);
   `deno task insomnia` regenerated — the 0.8 staleness gate and parity test make skipping this
   impossible, their first real-world exercise.
7. ROADMAP: item checked off.

### Out of scope

SKU-based lookup endpoints, bulk import, barcode formats/validation (EAN/UPC checksums), SKU on
showcase cards.

## Functional Requirements

- FR-1: create with a valid `sku` persists it; duplicate → 409; invalid format → 400 with field
  detail.
- FR-2: PATCH sets, changes (old index freed — the previous SKU becomes claimable) and clears the
  SKU (`""`); conflicts → 409.
- FR-3: checkout of a product with a SKU produces a snapshot carrying it; without one, the snapshot
  has no `sku` key (both flows).
- FR-4: products created before this change keep working (list, page, patch) with no SKU.
- FR-5: product view shows the SKU line only when present, escaped.
- FR-6: KV driver enforces uniqueness atomically (index claimed in the same transaction as the
  record).

## Non Functional Requirements

- NFR-1: zero dependencies; no migration script (sparse optional field).
- NFR-2: OpenAPI/Insomnia updated in the same patch (gates enforce it).

## Tests

DTO matrix (format/length), create/patch uniqueness incl. release-on- change and clear, snapshot
with/without SKU through the service path, KV atomic claim + legacy record, page display + escaping.
Estimated +6–8 tests.

## Documentation

Products docs + payments snapshot note, CHANGELOG, ROADMAP check-off.
