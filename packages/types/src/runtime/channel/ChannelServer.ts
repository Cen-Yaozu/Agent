/**
 * ChannelServer - Listens for incoming Channel connections
 *
 * ChannelServer is the "listening" side of the Channel abstraction.
 * It accepts incoming connections and creates a Channel for each.
 *
 * Architecture:
 * ```
 * nodeRuntime (with ChannelServer)     remoteRuntime (with Channel)
 * ┌─────────────────────────────┐     ┌─────────────────────────────┐
 * │  ChannelServer.listen()     │     │                             │
 * │         │                   │     │  Channel.connect() ────────►│
 * │         ▼                   │     │                             │
 * │  onConnection(channel) ◄────┼─────┤                             │
 * │         │                   │     │                             │
 * │         ▼                   │     │                             │
 * │  channel.on() / send()  ◄───┼────►│  channel.on() / send()      │
 * └─────────────────────────────┘     └─────────────────────────────┘
 * ```
 *
 * @example
 * ```typescript
 * // Server side (nodeRuntime)
 * const server = new WebSocketChannelServer({ port: 5200 });
 *
 * server.onConnection((channel) => {
 *   console.log("New connection");
 *
 *   channel.on((event) => {
 *     // Handle incoming events from remote
 *     if (event.type === "message_send_request") {
 *       // Process and respond
 *       channel.send({ type: "text_delta", data: { text: "Hello" } });
 *     }
 *   });
 * });
 *
 * await server.listen();
 * ```
 */

import type { Channel, ChannelUnsubscribe } from "./Channel";

/**
 * ChannelServer state
 */
export type ChannelServerState = "stopped" | "starting" | "listening" | "stopping";

/**
 * Connection handler - called when a new Channel connects
 */
export type ConnectionHandler = (channel: Channel) => void;

/**
 * ChannelServer state change handler
 */
export type ChannelServerStateHandler = (state: ChannelServerState) => void;

/**
 * ChannelServer - Server-side Channel listener
 *
 * Accepts incoming connections and creates Channels for each.
 * Used by nodeRuntime to accept connections from remoteRuntime.
 */
export interface ChannelServer {
  /**
   * Current server state
   */
  readonly state: ChannelServerState;

  /**
   * Start listening for connections
   *
   * @returns Promise that resolves when server is ready
   * @throws Error if server fails to start
   */
  listen(): Promise<void>;

  /**
   * Stop listening and close all connections
   */
  close(): Promise<void>;

  /**
   * Subscribe to new connections
   *
   * @param handler - Called when a new Channel connects
   * @returns Unsubscribe function
   */
  onConnection(handler: ConnectionHandler): ChannelUnsubscribe;

  /**
   * Subscribe to server state changes
   *
   * @param handler - State change handler
   * @returns Unsubscribe function
   */
  onStateChange(handler: ChannelServerStateHandler): ChannelUnsubscribe;

  /**
   * Get all active channels
   */
  readonly channels: ReadonlyArray<Channel>;
}
