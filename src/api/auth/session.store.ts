/**
 * Session storage — driver-aware, revocable server-side sessions.
 *
 * KV sessions use native `expireIn` for automatic cleanup; the in-memory
 * store expires on read. Session ids are 128-bit CSPRNG values — with a
 * server-side store, id entropy is the secret (no cookie signing needed).
 */

import { env } from "@/config/env.ts";
import { requireKv } from "@/shared/storage.ts";

/** Session lifetime: 7 days. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** A server-side session record. */
export interface Session {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

/** Storage contract for sessions. */
export interface SessionStore {
  create(userId: string): Promise<Session>;
  get(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
}

/** Generates a 128-bit session id (hex). */
function sessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Builds a new session record. */
function newSession(userId: string): Session {
  const now = Date.now();
  return {
    id: sessionId(),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };
}

/** In-memory {@link SessionStore} (development/tests); expires on read. */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  /** Creates and stores a session for a user. */
  create(userId: string): Promise<Session> {
    const session = newSession(userId);
    this.sessions.set(session.id, session);
    return Promise.resolve(session);
  }

  /** @returns The live session, or null (expired ones are dropped). */
  get(id: string): Promise<Session | null> {
    const session = this.sessions.get(id);
    if (session === undefined) return Promise.resolve(null);
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.sessions.delete(id);
      return Promise.resolve(null);
    }
    return Promise.resolve(session);
  }

  /** Revokes a session. */
  delete(id: string): Promise<void> {
    this.sessions.delete(id);
    return Promise.resolve();
  }
}

/** Deno KV {@link SessionStore} with native TTL expiry. */
export class KvSessionStore implements SessionStore {
  constructor(private readonly kv: Deno.Kv) {}

  /** Creates and stores a session for a user (TTL via expireIn). */
  async create(userId: string): Promise<Session> {
    const session = newSession(userId);
    await this.kv.set(["sessions", session.id], session, { expireIn: SESSION_TTL_MS });
    return session;
  }

  /** @returns The live session, or null. */
  async get(id: string): Promise<Session | null> {
    const entry = await this.kv.get<Session>(["sessions", id]);
    if (entry.value === null) return null;
    if (Date.parse(entry.value.expiresAt) <= Date.now()) {
      await this.kv.delete(["sessions", id]);
      return null;
    }
    return entry.value;
  }

  /** Revokes a session. */
  async delete(id: string): Promise<void> {
    await this.kv.delete(["sessions", id]);
  }
}

/**
 * Chooses the {@link SessionStore} for the configured storage driver.
 *
 * @returns Session store instance.
 */
export function createSessionStore(): SessionStore {
  return env.STORAGE_DRIVER === "kv" ? new KvSessionStore(requireKv()) : new InMemorySessionStore();
}
