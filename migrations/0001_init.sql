-- DenoX initial schema. Mirrors what the memory/KV drivers imply: the same
-- entities, the same uniqueness guarantees (now native constraints), nested
-- shapes as JSONB so the domain model is unchanged across drivers.

CREATE TABLE users (
  id            UUID PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE products (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  sku         TEXT UNIQUE,
  price       NUMERIC NOT NULL,
  description TEXT,
  images      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL
);

-- Stale slugs map to their product for 301 redirects (lazy migration).
CREATE TABLE product_slugs (
  slug       TEXT PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE payments (
  id               UUID PRIMARY KEY,
  provider         TEXT NOT NULL,
  provider_id      TEXT NOT NULL,
  status           TEXT NOT NULL,
  amount_cents     INTEGER NOT NULL,
  refunded_cents   INTEGER NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL,
  description      TEXT,
  product_id       TEXT,
  product_snapshot JSONB,
  user_id          UUID NOT NULL,
  metadata         JSONB,
  transitions      JSONB NOT NULL DEFAULT '[]',
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL,
  updated_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX payments_by_provider_id ON payments (provider_id);
CREATE INDEX payments_by_user ON payments (user_id);

CREATE TABLE contact_messages (
  id         UUID PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

-- Webhook idempotency ledger (Postgres equivalent of the KV 24h ledger).
CREATE TABLE _denox_payment_events (
  event_id   TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
