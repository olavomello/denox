/**
 * Password hashing — native Web Crypto (zero dependencies).
 *
 * PBKDF2-HMAC-SHA256 with a per-user random salt and the parameters stored
 * inside the hash string (`pbkdf2:sha256:<iterations>:<saltB64>:<hashB64>`),
 * so they can evolve without breaking stored credentials. Comparison is
 * constant-time.
 */

const DEFAULT_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

/** Effective iteration count (env-overridable — lower only in tests). */
function iterations(): number {
  const raw = Deno.env.get("AUTH_PBKDF2_ITERATIONS");
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_ITERATIONS;
}

/** Derives PBKDF2 bits for a password/salt/iteration set. */
async function derive(password: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt.slice().buffer, iterations: iter },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Constant-time byte comparison. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

const toB64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromB64 = (value: string): Uint8Array => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

/**
 * Hashes a password for storage.
 *
 * @param password Plain-text password.
 * @returns Self-describing hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  const iter = iterations();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iter);
  return `pbkdf2:sha256:${iter}:${toB64(salt)}:${toB64(hash)}`;
}

/**
 * Verifies a password against a stored hash (constant-time).
 *
 * @param password Candidate password.
 * @param stored Stored hash string.
 * @returns True when the password matches.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const iter = Number(parts[2]);
  if (!Number.isInteger(iter) || iter <= 0) return false;
  try {
    const salt = fromB64(parts[3]!);
    const expected = fromB64(parts[4]!);
    const actual = await derive(password, salt, iter);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * A real hash of an unguessable value, verified against on unknown-user
 * logins so both failure paths cost the same (timing equalization).
 */
export const DUMMY_HASH: Promise<string> = hashPassword(crypto.randomUUID());
