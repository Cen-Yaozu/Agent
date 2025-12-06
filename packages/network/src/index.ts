/**
 * @agentxjs/network - Network layer for AgentX
 *
 * Provides WebSocket Peer for bidirectional communication.
 *
 * ## Usage
 *
 * **Source (downstream only)**:
 * ```typescript
 * import { createWebSocketPeer } from "@agentxjs/network";
 *
 * const peer = createWebSocketPeer();
 * await peer.listenDownstream({ port: 5200 });
 * peer.onDownstreamConnection((conn) => {
 *   conn.onEvent((event) => console.log(event));
 * });
 * ```
 *
 * **Relay (upstream + downstream)**:
 * ```typescript
 * import { createWebSocketPeer } from "@agentxjs/network";
 *
 * const peer = createWebSocketPeer();
 * await peer.connectUpstream({ url: "ws://source:5200" });
 * await peer.listenDownstream({ port: 5201 });
 *
 * // Forward upstream events to downstream
 * peer.onUpstreamEvent((event) => peer.broadcast(event));
 * ```
 *
 * **Terminal (upstream only)**:
 * ```typescript
 * import { createWebSocketPeer } from "@agentxjs/network";
 *
 * const peer = createWebSocketPeer();
 * await peer.connectUpstream({ url: "ws://relay:5201" });
 * peer.onUpstreamEvent((event) => console.log(event));
 * ```
 *
 * @packageDocumentation
 */

export { WebSocketPeer, createWebSocketPeer } from "./WebSocketPeer";
