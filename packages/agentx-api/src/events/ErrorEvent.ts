/**
 * Error Event
 *
 * Emitted when an error occurs during agent operation.
 * Uses subtype to distinguish different error sources.
 */

import type { BaseAgentEvent } from "./BaseAgentEvent";

/**
 * Error severity level
 */
export type ErrorSeverity = "fatal" | "error" | "warning";

/**
 * Error source/category
 */
export type ErrorSubtype =
  | "system"      // System errors (WebSocket, network, infrastructure)
  | "agent"       // Agent logic errors (state, validation, processing)
  | "llm"         // LLM/Claude SDK errors (API, rate limit, content filter)
  | "validation"  // Input validation errors
  | "unknown";    // Unknown/uncategorized errors

/**
 * Error Event
 *
 * @example System error
 * {
 *   type: "error",
 *   subtype: "system",
 *   severity: "error",
 *   message: "WebSocket connection lost",
 *   code: "WS_DISCONNECTED"
 * }
 *
 * @example LLM error
 * {
 *   type: "error",
 *   subtype: "llm",
 *   severity: "error",
 *   message: "Rate limit exceeded",
 *   code: "RATE_LIMIT",
 *   details: { retryAfter: 60 }
 * }
 */
export interface ErrorEvent extends BaseAgentEvent {
  type: "error";

  /**
   * Error source/category
   */
  subtype: ErrorSubtype;

  /**
   * Error severity level
   */
  severity: ErrorSeverity;

  /**
   * Human-readable error message
   */
  message: string;

  /**
   * Machine-readable error code (optional)
   * Examples: "WS_DISCONNECTED", "RATE_LIMIT", "INVALID_INPUT"
   */
  code?: string;

  /**
   * Additional error details (optional)
   * Can include stack trace, retry info, etc.
   */
  details?: unknown;

  /**
   * Whether this error is recoverable
   */
  recoverable?: boolean;
}
