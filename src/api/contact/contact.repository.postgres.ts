/**
 * Postgres {@link ContactRepository}.
 */

import type { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import type { ContactMessage, NewContactMessage } from "@/api/contact/contact.model.ts";
import type { ContactRepository } from "@/api/contact/contact.repository.ts";

interface ContactRow {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: Date;
}

/** Postgres-backed contact message store. */
export class PostgresContactRepository implements ContactRepository {
  constructor(private readonly pool: Pool) {}

  /** Stores a message. */
  async create(data: NewContactMessage): Promise<ContactMessage> {
    const record: ContactMessage = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      message: data.message,
      createdAt: new Date().toISOString(),
    };
    const client = await this.pool.connect();
    try {
      await client.queryObject(
        `INSERT INTO contact_messages (id, name, email, message, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.id, record.name, record.email, record.message, record.createdAt],
      );
      return record;
    } finally {
      client.release();
    }
  }

  /** @returns Every message, newest first. */
  async findAll(): Promise<readonly ContactMessage[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.queryObject<ContactRow>(
        "SELECT * FROM contact_messages ORDER BY created_at DESC",
      );
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        message: row.message,
        createdAt: row.created_at.toISOString(),
      }));
    } finally {
      client.release();
    }
  }
}
