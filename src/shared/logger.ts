/**
 * Logging abstraction.
 *
 * Every module logs through this interface instead of calling `console.*`
 * directly. This keeps the output format consistent (pretty in development,
 * JSON lines in production) and allows the sink to be replaced (file,
 * OpenTelemetry, etc.) without touching call sites.
 *
 * SOLID: call sites depend on the {@link Logger} interface, not on the
 * concrete {@link ConsoleLogger} (dependency inversion).
 */

import type { LogLevel } from "@/config/env.ts";
import { env } from "@/config/env.ts";

/** Structured metadata attached to a log entry. */
export type LogContext = Readonly<Record<string, unknown>>;

/** Minimal logging contract used across the application. */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const LEVEL_WEIGHT: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * Console based {@link Logger}.
 *
 * Emits JSON lines in production (machine readable) and a compact human
 * readable format everywhere else. Entries below the configured minimum
 * level are dropped.
 */
export class ConsoleLogger implements Logger {
  constructor(
    private readonly minLevel: LogLevel,
    private readonly json: boolean,
  ) {}

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) return;

    if (this.json) {
      // deno-lint-ignore no-console
      console.log(JSON.stringify({
        level,
        message,
        time: new Date().toISOString(),
        ...context,
      }));
      return;
    }

    const suffix = context ? ` ${JSON.stringify(context)}` : "";
    // deno-lint-ignore no-console
    console.log(
      `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}${suffix}`,
    );
  }
}

/** Application wide logger instance. */
export const logger: Logger = new ConsoleLogger(env.LOG_LEVEL, env.APP_ENV === "production");
