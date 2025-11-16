/**
 * Result Event
 *
 * Emitted when conversation completes successfully.
 * Contains final statistics and usage information.
 *
 * Note: Error results are now emitted as ErrorEvent (type: "error", subtype: "llm")
 *
 * Aligned with: SDKResultMessage (subtype: "success") from @anthropic-ai/claude-agent-sdk
 */

import type { TokenUsage } from "@deepractice-ai/agentx-types";
import type { BaseAgentEvent } from "./BaseAgentEvent";

/**
 * Result Event (Success)
 *
 * @example
 * {
 *   type: "result",
 *   durationMs: 15234,
 *   durationApiMs: 12000,
 *   numTurns: 3,
 *   result: "Task completed successfully",
 *   totalCostUsd: 0.05,
 *   usage: { input: 1000, output: 500, cacheRead: 0, cacheWrite: 0 }
 * }
 */
export interface ResultEvent extends BaseAgentEvent {
  type: "result";
  durationMs: number;
  durationApiMs: number;
  numTurns: number;
  result: string;
  totalCostUsd: number;
  usage: TokenUsage;
}
