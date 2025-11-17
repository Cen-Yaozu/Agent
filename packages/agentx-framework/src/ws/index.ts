/**
 * WebSocket Bridge
 *
 * Bidirectional WebSocket communication for AgentX.
 *
 * - WebSocketDriver (Client): WebSocket messages → Agent events
 * - WebSocketReactor (Server): Agent events → WebSocket messages
 */

export { WebSocketDriver, type WebSocketDriverConfig } from "./WebSocketDriver";
export { WebSocketReactor, type WebSocketLike } from "./WebSocketReactor";
