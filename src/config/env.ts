/**
 * Environment configuration.
 *
 * Reads, validates and freezes every environment variable used by the
 * application. Validation happens once at startup: any missing or invalid
 * value throws immediately (fail fast), so the process never runs in a
 * half-configured state.
 *
 * SOLID: single responsibility — this module only knows how to turn raw
 * environment variables into a typed, validated `Env` object. Nothing else
 * in the codebase reads `Deno.env` directly.
 */

/** Supported application environments. */
export type AppEnv = "development" | "test" | "production";

/** Supported log levels, ordered from most to least verbose. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Fully validated application configuration. */
export interface Env {
  readonly APP_ENV: AppEnv;
  readonly PORT: number;
  readonly HOSTNAME: string;
  readonly LOG_LEVEL: LogLevel;
  readonly CORS_ORIGIN: readonly string[] | "*";
  readonly RATE_LIMIT_MAX: number;
  readonly RATE_LIMIT_WINDOW_MS: number;
  readonly MAX_BODY_SIZE_BYTES: number;
  readonly REQUEST_TIMEOUT_MS: number;
}

/** Error thrown when the environment is invalid. Aborts startup. */
export class EnvValidationError extends Error {
  constructor(issues: readonly string[]) {
    super(`Invalid environment configuration:\n- ${issues.join("\n- ")}`);
    this.name = "EnvValidationError";
  }
}

const APP_ENVS: readonly AppEnv[] = ["development", "test", "production"];
const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/**
 * Parses and validates a raw environment map into a typed {@link Env}.
 *
 * Kept pure (no `Deno.env` access) so it can be unit tested with plain
 * objects.
 *
 * @param raw Raw key/value environment map.
 * @returns Frozen, validated configuration object.
 * @throws {EnvValidationError} When any variable is invalid.
 */
export function loadEnv(raw: Readonly<Record<string, string | undefined>>): Env {
  const issues: string[] = [];

  const readEnum = <T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T => {
    const value = raw[key] ?? fallback;
    if (!allowed.includes(value as T)) {
      issues.push(`${key} must be one of: ${allowed.join(", ")} (got "${value}")`);
      return fallback;
    }
    return value as T;
  };

  const readInt = (key: string, fallback: number, min: number, max: number): number => {
    const rawValue = raw[key];
    const value = rawValue === undefined || rawValue === "" ? fallback : Number(rawValue);
    if (!Number.isInteger(value) || value < min || value > max) {
      issues.push(`${key} must be an integer between ${min} and ${max} (got "${rawValue}")`);
      return fallback;
    }
    return value;
  };

  const readOrigins = (key: string, fallback: string): readonly string[] | "*" => {
    const value = (raw[key] ?? fallback).trim();
    if (value === "*") return "*";
    const origins = value.split(",").map((origin) => origin.trim()).filter(Boolean);
    if (origins.length === 0) {
      issues.push(`${key} must be "*" or a comma separated list of origins`);
      return "*";
    }
    return origins;
  };

  const env: Env = {
    APP_ENV: readEnum("APP_ENV", APP_ENVS, "development"),
    PORT: readInt("PORT", 8000, 1, 65535),
    HOSTNAME: (() => {
      const fallback = (raw["APP_ENV"] ?? "development") === "production" ? "0.0.0.0" : "127.0.0.1";
      return (raw["HOSTNAME"] ?? fallback).trim() || fallback;
    })(),
    LOG_LEVEL: readEnum("LOG_LEVEL", LOG_LEVELS, "info"),
    CORS_ORIGIN: readOrigins("CORS_ORIGIN", "*"),
    RATE_LIMIT_MAX: readInt("RATE_LIMIT_MAX", 100, 1, 1_000_000),
    RATE_LIMIT_WINDOW_MS: readInt("RATE_LIMIT_WINDOW_MS", 60_000, 100, 3_600_000),
    MAX_BODY_SIZE_BYTES: readInt("MAX_BODY_SIZE_BYTES", 1_048_576, 1, 104_857_600),
    REQUEST_TIMEOUT_MS: readInt("REQUEST_TIMEOUT_MS", 30_000, 100, 300_000),
  };

  if (env.APP_ENV === "production" && env.CORS_ORIGIN === "*") {
    issues.push('CORS_ORIGIN must not be "*" in production');
  }

  if (issues.length > 0) {
    throw new EnvValidationError(issues);
  }

  return Object.freeze(env);
}

/** Validated application configuration singleton. */
export const env: Env = loadEnv(Deno.env.toObject());
