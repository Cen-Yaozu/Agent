/**
 * @deepractice-ai/agentx-framework
 *
 * Unified API surface for the AgentX ecosystem.
 * Users only need to depend on this package.
 *
 * @packageDocumentation
 */

// ==================== Core API ====================
// Re-export from @deepractice-ai/agentx-core

/**
 * Create a new Agent instance
 *
 * @example
 * ```typescript
 * import { createAgent } from "@deepractice-ai/agentx-framework";
 * import { ClaudeDriver } from "@deepractice-ai/agentx-node";
 *
 * const agent = createAgent(new ClaudeDriver(config));
 * await agent.initialize();
 * ```
 */
export { createAgent } from "@deepractice-ai/agentx-core";

/**
 * AgentService - User-facing API
 *
 * Methods: initialize(), send(), react(), clear(), destroy()
 * Properties: id, sessionId, messages
 */
export { AgentService } from "@deepractice-ai/agentx-core";

// ==================== Messages (User Data) ====================
// Re-export from @deepractice-ai/agentx-types

export type {
  // Message types (user needs to work with these)
  Message,
  UserMessage,
  AssistantMessage,
  SystemMessage,
  ToolUseMessage,
  ErrorMessage,

  // Content parts (for multimodal messages)
  ContentPart,
  TextPart,
  ThinkingPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,

  // Message metadata
  MessageRole,
  ErrorSubtype,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";

// Type guards (user may need these)
export {
  isUserMessage,
  isAssistantMessage,
  isSystemMessage,
  isToolUseMessage,
  isErrorMessage,
  isTextPart,
  isThinkingPart,
  isImagePart,
  isFilePart,
  isToolCallPart,
  isToolResultPart,
} from "@deepractice-ai/agentx-types";

// ==================== Events (Observable Data) ====================
// Re-export from @deepractice-ai/agentx-event

export type {
  // Base event types
  AgentEvent,
  AgentEventType,

  // Event bus interfaces (for advanced users)
  EventBus,
  EventProducer,
  EventConsumer,
  Unsubscribe,
} from "@deepractice-ai/agentx-event";

// Stream layer events (real-time streaming)
export type {
  StreamEventType,
  MessageStartEvent,
  MessageDeltaEvent,
  MessageStopEvent,
  TextContentBlockStartEvent,
  TextDeltaEvent,
  TextContentBlockStopEvent,
  ToolUseContentBlockStartEvent,
  InputJsonDeltaEvent,
  ToolUseContentBlockStopEvent,
} from "@deepractice-ai/agentx-event";

// State layer events (lifecycle & state transitions)
export type {
  StateEventType,
  AgentReadyStateEvent,
  ConversationStartStateEvent,
  ConversationThinkingStateEvent,
  ConversationRespondingStateEvent,
  ConversationEndStateEvent,
  ToolPlannedStateEvent,
  ToolExecutingStateEvent,
  ToolCompletedStateEvent,
  ToolFailedStateEvent,
  StreamStartStateEvent,
  StreamCompleteStateEvent,
  ErrorOccurredStateEvent,
} from "@deepractice-ai/agentx-event";

// Message layer events (complete messages)
export type {
  MessageEventType,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ErrorMessageEvent,
} from "@deepractice-ai/agentx-event";

// Exchange layer events (analytics & cost tracking)
export type {
  ExchangeEventType,
  ExchangeRequestEvent,
  ExchangeResponseEvent,
} from "@deepractice-ai/agentx-event";

// ==================== Reactors (Event Handlers) ====================

// Core reactor types (from @deepractice-ai/agentx-core)
export type {
  Reactor,
  ReactorContext,
} from "@deepractice-ai/agentx-core";

// 4-layer user-facing reactor interfaces (framework-provided)
export type {
  StreamReactor,
  StateReactor,
  MessageReactor,
  ExchangeReactor,
} from "./reactors";

// Reactor adapters (for advanced framework usage)
export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "./reactors";

// ==================== Platform Abstraction ====================
// Re-export from @deepractice-ai/agentx-core

/**
 * AgentDriver interface - for implementing custom drivers
 *
 * Most users don't need this - use platform-specific drivers:
 * - ClaudeDriver from @deepractice-ai/agentx-node
 * - BrowserDriver from @deepractice-ai/agentx-browser
 */
export type { AgentDriver } from "@deepractice-ai/agentx-core";

/**
 * AgentLogger interface - for custom logging
 */
export type { AgentLogger, LogContext } from "@deepractice-ai/agentx-core";
export { LogLevel, LogFormatter } from "@deepractice-ai/agentx-core";

/**
 * EngineConfig - for configuring agent engine runtime
 */
export type { EngineConfig } from "@deepractice-ai/agentx-core";

// ==================== Agent Definition (Vue-like API) ====================
// Framework's high-level API for defining agents

/**
 * Define an agent structure (similar to Vue's defineComponent)
 *
 * @example
 * ```typescript
 * import { defineAgent } from "@deepractice-ai/agentx-framework";
 * import { ClaudeDriver, PinoLogger } from "@deepractice-ai/agentx-node";
 * import { ChatLogger } from "./reactors";
 *
 * const MyAgent = defineAgent({
 *   driver: ClaudeDriver,
 *   reactors: [ChatLogger],
 *   logger: PinoLogger,
 * });
 *
 * const agent = MyAgent.create({
 *   driver: { apiKey: "...", model: "..." },
 *   reactors: [{ prefix: "[Chat]" }],
 * });
 * ```
 */
export { defineAgent } from "./defineAgent";
export type {
  AgentDefinition,
  DefinedAgent,
} from "./defineAgent";

// Config Schema
export type {
  ConfigSchema,
  SchemaField,
  SchemaFieldType,
  InferConfig,
} from "./schema";

// ==================== Errors ====================
// Framework-specific errors

export { AgentConfigError, AgentAbortError } from "./errors";

// ==================== WebSocket Bridge ====================
// Bidirectional WebSocket communication for AgentX

/**
 * WebSocketDriver - Client-side WebSocket driver for browser
 * Converts WebSocket messages → Agent events
 */
export { WebSocketDriver, type WebSocketDriverConfig } from "./ws";

/**
 * WebSocketReactor - Server-side event forwarder
 * Converts Agent events → WebSocket messages
 * Implements all 4 reactor layers (Stream, State, Message, Exchange)
 */
export { WebSocketReactor, type WebSocketLike } from "./ws";

// ==================== MCP (Model Context Protocol) ====================
// Re-export from @deepractice-ai/agentx-types (for users working with MCP servers)

export type {
  // MCP Tools
  McpTool,
  McpToolResult,
  JsonSchema,

  // MCP Resources
  McpResource,
  McpResourceContents,

  // MCP Prompts
  McpPrompt,
  McpPromptMessage,

  // MCP Server
  McpServerInfo,
  McpServerCapabilities,

  // MCP Transport (from agentx-types, different from config/McpTransportConfig)
  McpStdioTransport,
  McpSseTransport,
  McpHttpTransport,
} from "@deepractice-ai/agentx-types";

export {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from "@deepractice-ai/agentx-types";
