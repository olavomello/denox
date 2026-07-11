/**
 * Shared auth singletons (session store + service) — separate from the
 * routes file so middleware can depend on them without import cycles.
 */

import { AuthService } from "@/api/auth/auth.service.ts";
import { createSessionStore, type SessionStore } from "@/api/auth/session.store.ts";
import { userRepository } from "@/api/users/user.singletons.ts";

/** Shared session store instance. */
export const sessionStore: SessionStore = createSessionStore();

/** Shared auth service instance. */
export const authService: AuthService = new AuthService(userRepository, sessionStore);
