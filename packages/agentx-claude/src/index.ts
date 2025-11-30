/**
 * AgentX Claude Driver
 *
 * Claude AI driver implementation using `@anthropic-ai/claude-agent-sdk`.
 * Node.js only - cannot run in browsers or edge runtimes.
 *
 * ## Design Principles
 *
 * 1. **ADK-First**: Built with defineDriver() for type-safe config
 * 2. **Stream Transform**: SDK messages → AgentX StreamEventType
 * 3. **Lazy Initialization**: SDK connection created on first message
 * 4. **Interrupt Support**: Uses SDK's native interrupt() method
 *
 * ## Module Structure
 *
 * | Module                    | Purpose                                      |
 * |---------------------------|----------------------------------------------|
 * | ClaudeDriver.ts           | ADK-based driver implementation              |
 * | ClaudeConfig.ts           | Config schema (apiKey, model, systemPrompt)  |
 * | messageTransform.ts       | SDK message → StreamEventType transformer    |
 * | buildOptions.ts           | AgentContext → SDK Options converter         |
 * | eventBuilders.ts          | StreamEventType factory functions            |
 *
 * ## Key Design Decisions
 *
 * ### 1. Why Separate Package?
 *
 * **Problem**: Claude SDK (`@anthropic-ai/claude-agent-sdk`) has Node.js-only deps:
 * - Spawns child processes (Claude Code CLI)
 * - Uses `child_process`, `fs`, native modules
 * - Cannot run in browsers or edge runtimes
 *
 * **Decision**: Keep Claude-specific code in separate package.
 *
 * **Benefits**:
 * - `agentx` stays platform-agnostic
 * - Tree-shaking removes unused Node.js code
 * - Clear import boundary
 *
 * ### 2. Why Lazy Initialization?
 *
 * **Problem**: Claude SDK query() starts streaming immediately.
 * We need to wait for first message.
 *
 * **Decision**: Initialize SDK on first receive() call.
 *
 * **Flow**:
 * ```
 * 1. Driver created (SDK not initialized)
 * 2. First receive() call
 * 3. Initialize SDK query()
 * 4. Send message to SDK
 * 5. Transform and yield events
 * ```
 *
 * **Benefits**:
 * - No wasted resources for unused agents
 * - Config available at initialization time
 * - Clear initialization point
 *
 * ### 3. Why SDK interrupt() over AbortController.abort()?
 *
 * **Problem**: How to stop a running operation?
 *
 * **Decision**: Use SDK's native `query.interrupt()` method.
 *
 * **Rationale**:
 * - interrupt() only stops current turn
 * - abort() destroys entire SDK connection
 * - interrupt() allows resuming conversation
 *
 * ### 4. Why Transform to StreamEventType?
 *
 * **Problem**: SDK produces its own message format. AgentX expects StreamEventType.
 *
 * **Decision**: Transform SDK messages to AgentX events in messageTransform.ts.
 *
 * **Mapping**:
 * ```
 * SDK assistant.partial → text_delta
 * SDK assistant.result → text_content_block_stop + message_stop
 * SDK tool.pending → tool_use_content_block_start
 * SDK tool.result → tool_result
 * ```
 *
 * **Benefits**:
 * - AgentX Engine processes standard events
 * - UI code doesn't know about SDK internals
 * - Easy to add other AI drivers (OpenAI, Gemini)
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx-adk";
 * import { createAgentX } from "@deepractice-ai/agentx";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-claude";
 *
 * const MyAgent = defineAgent({
 *   name: "Assistant",
 *   driver: ClaudeDriver,
 *   config: { model: "claude-sonnet-4-20250514" },
 * });
 *
 * const agentx = createAgentX();
 * const agent = agentx.agents.create(MyAgent, {
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * });
 * ```
 *
 * @packageDocumentation
 */

// ==================== ADK-based Driver ====================
export { ClaudeDriver } from "./ClaudeDriver";
export { claudeSDKConfig as claudeConfig } from "./ClaudeConfig";
