/**
 * @agentxjs/remote-runtime
 *
 * Remote Runtime for AgentX - connects to remote AgentX server via SSE/WebSocket.
 *
 * @example
 * ```typescript
 * import { createAgentX } from "agentxjs";
 * import { remoteRuntime } from "@agentxjs/remote-runtime";
 *
 * const agentx = createAgentX(remoteRuntime({
 *   serverUrl: "http://localhost:5200/agentx",
 * }));
 *
 * // Listen to ecosystem events
 * agentx.on((event) => {
 *   console.log("Event:", event.type);
 * });
 * ```
 *
 * @packageDocumentation
 */

// ==================== Runtime Factory (Primary API) ====================
export {
  remoteRuntime,
  sseRuntime, // deprecated alias
  createSSERuntime, // deprecated alias
  RemoteRuntime,
  type RemoteRuntimeConfig,
} from "./RemoteRuntime";

// ==================== Types ====================
export type { ConnectionState } from "./types";

// ==================== Channel ====================
export { WebSocketChannel, createWebSocketChannel, type WebSocketChannelConfig } from "./channel";

// ==================== Advanced: Direct Class Access ====================
export { createSSEDriver, type SSEDriverConfig } from "./SSEDriver";
export { BrowserLogger, type BrowserLoggerOptions } from "./logger";
export { BrowserLoggerFactory, type BrowserLoggerFactoryOptions } from "./logger";
export { RemoteRepository } from "./repository";
