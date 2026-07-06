/**
 * Unit tests — environment validation (src/config/env.ts).
 */

import { assertEquals, assertThrows } from "@std/assert";
import { EnvValidationError, loadEnv } from "@/config/env.ts";

Deno.test("loadEnv applies safe defaults for an empty environment", () => {
  const env = loadEnv({});
  assertEquals(env.APP_ENV, "development");
  assertEquals(env.PORT, 8000);
  assertEquals(env.LOG_LEVEL, "info");
  assertEquals(env.CORS_ORIGIN, "*");
});

Deno.test("loadEnv parses provided values", () => {
  const env = loadEnv({
    APP_ENV: "test",
    PORT: "9001",
    LOG_LEVEL: "error",
    CORS_ORIGIN: "https://a.dev, https://b.dev",
  });
  assertEquals(env.APP_ENV, "test");
  assertEquals(env.PORT, 9001);
  assertEquals(env.CORS_ORIGIN, ["https://a.dev", "https://b.dev"]);
});

Deno.test("loadEnv fails fast on invalid values", () => {
  assertThrows(() => loadEnv({ PORT: "not-a-number" }), EnvValidationError);
  assertThrows(() => loadEnv({ APP_ENV: "staging" }), EnvValidationError);
  assertThrows(() => loadEnv({ RATE_LIMIT_MAX: "0" }), EnvValidationError);
});

Deno.test("loadEnv validates the storage driver and defaults to memory", () => {
  assertEquals(loadEnv({}).STORAGE_DRIVER, "memory");
  assertEquals(loadEnv({ STORAGE_DRIVER: "kv", KV_PATH: ":memory:" }).KV_PATH, ":memory:");
  assertThrows(() => loadEnv({ STORAGE_DRIVER: "banana" }), EnvValidationError);
});

Deno.test("loadEnv rejects wildcard CORS in production", () => {
  assertThrows(
    () => loadEnv({ APP_ENV: "production", CORS_ORIGIN: "*" }),
    EnvValidationError,
  );
});
