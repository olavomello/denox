/**
 * Test helper — deterministic admin sessions.
 *
 * The "first user is admin" rule holds only once per process, and test
 * files share the app singletons; creating admins through the repository
 * seam keeps every suite independent of execution order.
 */

import { sessionStore } from "@/api/auth/auth.singletons.ts";
import { userRepository } from "@/api/users/user.singletons.ts";
import { hashPassword } from "@/shared/password.ts";

Deno.env.set("AUTH_PBKDF2_ITERATIONS", "1000");

/**
 * Creates an admin user directly and returns a valid session cookie.
 *
 * @returns Cookie header value (denox_session=...).
 */
export async function adminCookie(): Promise<string> {
  const admin = await userRepository.create({
    name: "Test Admin",
    email: `admin-${crypto.randomUUID()}@test.local`,
    passwordHash: await hashPassword("irrelevant-here"),
    role: "admin",
  });
  const session = await sessionStore.create(admin.id);
  return `denox_session=${session.id}`;
}

/**
 * Creates a regular (non-admin) user directly and returns a session
 * cookie — for authorization-matrix tests.
 *
 * @returns Cookie header value and the user id.
 */
export async function userCookie(): Promise<{ cookie: string; userId: string }> {
  const user = await userRepository.create({
    name: "Test User",
    email: `user-${crypto.randomUUID()}@test.local`,
    passwordHash: await hashPassword("irrelevant-here"),
    role: "user",
  });
  const session = await sessionStore.create(user.id);
  return { cookie: `denox_session=${session.id}`, userId: user.id };
}
