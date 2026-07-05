/**
 * Application exception hierarchy.
 *
 * Domain and application code (services, repositories, DTO parsers) signal
 * failures by throwing one of these typed exceptions. The HTTP layer
 * (middleware/error_handler.ts) is the only place that translates them into
 * responses — services never build HTTP responses themselves.
 *
 * SOLID: open/closed — new failure modes are added by extending
 * {@link AppException}, never by editing the error handler.
 */

/** Machine readable error codes returned in API error envelopes. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

/** Extra machine readable details attached to an error (field errors, etc.). */
export type ErrorDetails = Readonly<Record<string, unknown>>;

/**
 * Base class for every expected application failure.
 *
 * `status` is a plain number here to keep the shared layer independent from
 * any HTTP framework; the error handler middleware owns the mapping to a
 * concrete response.
 */
export abstract class AppException extends Error {
  protected constructor(
    /** HTTP status the error handler should respond with. */
    readonly status: number,
    /** Stable machine readable code for API consumers. */
    readonly code: ErrorCode,
    message: string,
    /** Optional structured details (safe to expose to clients). */
    readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — the request payload failed validation. */
export class ValidationException extends AppException {
  constructor(message: string, details?: ErrorDetails) {
    super(400, "VALIDATION_ERROR", message, details);
  }
}

/** 400 — the request is malformed (invalid JSON, missing body, ...). */
export class BadRequestException extends AppException {
  constructor(message: string, details?: ErrorDetails) {
    super(400, "BAD_REQUEST", message, details);
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundException extends AppException {
  constructor(message: string, details?: ErrorDetails) {
    super(404, "NOT_FOUND", message, details);
  }
}

/** 409 — the request conflicts with the current state (duplicates, ...). */
export class ConflictException extends AppException {
  constructor(message: string, details?: ErrorDetails) {
    super(409, "CONFLICT", message, details);
  }
}

/** 429 — the client exceeded the configured rate limit. */
export class TooManyRequestsException extends AppException {
  constructor(message = "Too many requests", details?: ErrorDetails) {
    super(429, "TOO_MANY_REQUESTS", message, details);
  }
}
