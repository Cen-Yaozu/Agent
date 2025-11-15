/**
 * AgentProvider Interface (SPI - Service Provider Interface)
 *
 * Platform-specific implementation interface for Agent.
 * Different platforms (Node.js, Browser) implement this interface differently.
 *
 * Provider's responsibility: Adapt external SDKs/protocols to our AgentEvent standard.
 *
 * Examples:
 * - ClaudeProvider (Node.js): Adapts @anthropic-ai/claude-agent-sdk → AgentEvent
 * - WebSocketProvider (Browser): Receives AgentEvent from WebSocket server
 * - MockProvider (Testing): Generates mock AgentEvent for testing
 *
 * Key principle: Provider must understand and produce AgentEvent,
 * NOT the other way around. We define the standard, providers adapt to it.
 */

import type { Message } from "@deepractice-ai/agentx-types";
import type { AgentConfig, AgentEvent } from "@deepractice-ai/agentx-api";

/**
 * AgentProvider interface
 *
 * Platform-specific implementation must implement this interface.
 * Provider is responsible for transforming external SDK events into AgentEvent.
 */
export interface AgentProvider {
  /**
   * Session ID for this provider instance (Agent's session identifier)
   */
  readonly sessionId: string;

  /**
   * Provider's internal session ID (e.g., SDK's real session ID)
   *
   * This is the actual session identifier used by the underlying SDK/service.
   * Provider must maintain the mapping between sessionId and providerSessionId.
   *
   * @example
   * ```typescript
   * // ClaudeProvider
   * sessionId: "session_123_abc"           // Agent's session ID
   * providerSessionId: "f1fb2903-2a58..."  // Claude SDK's real session ID
   *
   * // Resume uses providerSessionId:
   * query({ resume: this.providerSessionId })
   * ```
   */
  readonly providerSessionId: string | null;

  /**
   * Send a message and stream responses
   *
   * Provider must yield AgentEvent types (our standard).
   * It's the provider's job to adapt external SDK events to AgentEvent.
   *
   * @param message - User message to send
   * @param messages - Full conversation history (for context)
   * @returns AsyncGenerator that yields AgentEvent (our standard)
   *
   * @example
   * ```typescript
   * // ClaudeProvider implementation
   * async *send(message: string, messages: Message[]): AsyncGenerator<AgentEvent> {
   *   const query = claudeSdk.query({ prompt: message });
   *   for await (const sdkMsg of query) {
   *     // Adapt Claude SDK message to our AgentEvent
   *     yield this.adaptToAgentEvent(sdkMsg);
   *   }
   * }
   * ```
   */
  send(message: string, messages: ReadonlyArray<Message>): AsyncGenerator<AgentEvent>;

  /**
   * Get complete message history maintained by the provider
   *
   * Provider must capture all messages from events (user, assistant, tool results)
   * to maintain a complete conversation history including tool use cycles.
   *
   * @returns Complete message history including tool use and tool results
   *
   * @example
   * ```typescript
   * const messages = provider.getMessages();
   * // Returns: [
   * //   { role: "user", content: "Hello" },
   * //   { role: "assistant", content: [...] },
   * //   { role: "user", content: [tool_result] },  // Tool result
   * //   { role: "assistant", content: [...] }
   * // ]
   * ```
   */
  getMessages(): ReadonlyArray<Message>;

  /**
   * Validate configuration
   * Throws if configuration is invalid
   *
   * @param config - Agent configuration to validate
   */
  validateConfig(config: AgentConfig): void;

  /**
   * Abort current operation
   */
  abort(): void;

  /**
   * Destroy provider and clean up resources
   */
  destroy(): Promise<void>;
}
