/**
 * AgentX Platform
 *
 * The unified API for AI Agent lifecycle management.
 * Provides both Local mode (in-process) and Remote mode (SSE-based).
 *
 * ## Design Principles
 *
 * 1. **Dual-Mode Architecture**: Single API, two runtime modes
 * 2. **Web Standards First**: Uses Request/Response, ReadableStream, EventSource
 * 3. **Framework Agnostic**: Adapters for Express, Hono, Next.js, etc.
 * 4. **Stream-Only SSE**: Server forwards raw Stream events, client reassembles
 *
 * ## Module Structure
 *
 * | Module           | Files | Purpose                                    |
 * |------------------|-------|--------------------------------------------|
 * | AgentX.ts        | 1     | Factory: createAgentX() for Local/Remote   |
 * | LocalAgentX/     | 3     | In-process agent management                |
 * | RemoteAgentX/    | 2     | SSE client for remote agents               |
 * | server/          | 4     | SSE server and HTTP handlers               |
 * | adapters/        | 3     | Framework adapters (Express, Hono, Next)   |
 *
 * ## Key Design Decisions
 *
 * ### 1. Why Dual-Mode Architecture?
 *
 * **Problem**: AI agents need different deployment patterns:
 * - Development: Run locally for fast iteration
 * - Production: Run on server for resource management
 * - Edge: Run in browser for low latency
 *
 * **Solution**: Single AgentX interface with mode selection at creation:
 * ```typescript
 * // Same API, different runtime
 * const local = createAgentX();  // Local: in-process
 * const remote = createAgentX({ mode: 'remote', serverUrl: '...' });  // Remote: SSE
 * ```
 *
 * ### 2. Why Stream-Only SSE?
 *
 * **Problem**: How to efficiently transmit agent events to browser?
 *
 * **Decision**: Server ONLY forwards Stream Layer events (text_delta, tool_call, etc.).
 * Browser's AgentEngine reassembles Message/State/Turn Layer events.
 *
 * **Rationale**:
 * - Stream events are small, efficient for transmission
 * - Browser already has AgentEngine (no code duplication)
 * - Different clients can reassemble differently
 * - Server doesn't need to know client's event requirements
 *
 * ### 3. Why Web Standards (Request/Response)?
 *
 * **Problem**: HTTP frameworks have different APIs (Express req/res, Hono c, etc.)
 *
 * **Solution**: Core handler uses Web Standard Request/Response.
 * Framework adapters convert to/from framework-specific APIs.
 *
 * **Benefits**:
 * - Single core implementation
 * - Works with any framework via thin adapters
 * - Future-proof (Web Standards are stable)
 *
 * ### 4. Why Default Singleton Pattern?
 *
 * **Problem**: Most apps need just one AgentX instance.
 *
 * **Solution**: Export default `agentx` singleton + `createAgentX()` for advanced use.
 *
 * **Rationale**:
 * - Simple apps: `import { agentx } from "@deepractice-ai/agentx"`
 * - Complex apps: `const custom = createAgentX({ ... })`
 * - Avoids global state issues (singleton is just a convenience)
 *
 * @example
 * ```typescript
 * import { agentx, createAgentX } from "@deepractice-ai/agentx";
 *
 * // Simple: Use default singleton
 * const agent = agentx.agents.create(MyAgent, { apiKey: "xxx" });
 *
 * // Advanced: Create custom instance
 * const local = createAgentX();  // Local mode
 * const remote = createAgentX({
 *   mode: 'remote',
 *   remote: { serverUrl: "http://localhost:5200/agentx" }
 * });
 * ```
 *
 * @packageDocumentation
 */

import type { AgentXLocal, Agent, AgentDefinition } from "@deepractice-ai/agentx-types";
import { createAgentX } from "./AgentX";

// ===== Default AgentX Instance (Local) =====

/**
 * Default AgentX instance (local singleton)
 *
 * Use this for simple scenarios. For advanced use cases
 * (remote mode, multiple instances), use createAgentX().
 *
 * @example
 * ```typescript
 * import { agentx } from "@deepractice-ai/agentx";
 *
 * const agent = agentx.agents.create(MyAgent, config);
 * agentx.agents.get(agentId);
 * await agentx.agents.destroy(agentId);
 *
 * agentx.errors.addHandler({ handle: (id, err) => ... });
 * ```
 */
export const agentx: AgentXLocal = createAgentX() as AgentXLocal;

// ===== Convenience Functions =====
// These use the default agentx instance

/**
 * Create a new agent (using default agentx instance)
 *
 * @example
 * ```typescript
 * const agent = createAgent(MyAgent, { apiKey: "xxx" });
 * ```
 */
export function createAgent<TDriver extends import("@deepractice-ai/agentx-types").DriverClass>(
  definition: AgentDefinition<TDriver>,
  config: Record<string, unknown>
): Agent {
  return agentx.agents.create(definition, config);
}

/**
 * Get an existing agent by ID (using default agentx instance)
 */
export function getAgent(agentId: string): Agent | undefined {
  return agentx.agents.get(agentId);
}

/**
 * Check if an agent exists (using default agentx instance)
 */
export function hasAgent(agentId: string): boolean {
  return agentx.agents.has(agentId);
}

/**
 * Destroy an agent by ID (using default agentx instance)
 */
export function destroyAgent(agentId: string): Promise<void> {
  return agentx.agents.destroy(agentId);
}

/**
 * Destroy all agents (using default agentx instance)
 */
export function destroyAll(): Promise<void> {
  return agentx.agents.destroyAll();
}

// ===== Advanced: Custom AgentX Instance =====

export { createAgentX } from "./AgentX";

// ===== Re-export Types from @deepractice-ai/agentx-types =====

export type {
  // AgentX platform
  AgentX,
  AgentXLocal,
  AgentXRemote,
  AgentXOptions,
  AgentXLocalOptions,
  AgentXRemoteOptions,
  // Agent module
  AgentManager,
  // Error module
  ErrorManager,
  ErrorHandler,
  // Session module
  SessionManager,
  LocalSessionManager,
  RemoteSessionManager,
  Session,
  // Platform module
  PlatformManager,
  // HTTP Endpoints
  AgentInfo,
  ListAgentsResponse,
  CreateAgentRequest,
  CreateAgentResponse,
  ListAgentsEndpoint,
  GetAgentEndpoint,
  CreateAgentEndpoint,
  DestroyAgentEndpoint,
  ListSessionsResponse,
  CreateSessionEndpoint,
  GetSessionEndpoint,
  ListSessionsEndpoint,
  DestroySessionEndpoint,
  PlatformInfo,
  HealthStatus,
  GetInfoEndpoint,
  GetHealthEndpoint,
  // Agent contracts
  Agent,
  AgentDriver,
  AgentPresenter,
  AgentDefinition,
  AgentContainer,
  AgentContext,
  AgentContextBase,
  AgentOutput,
  AgentLifecycle,
  AgentEventHandler,
  AgentEventType,
  Unsubscribe,
  // Error types
  AgentError,
  ErrorSeverity,
} from "@deepractice-ai/agentx-types";
