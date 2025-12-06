/**
 * Network Module - WebSocket Peer communication
 *
 * Provides Peer abstraction for bidirectional node communication.
 *
 * @packageDocumentation
 */

export type {
  Peer,
  PeerState,
  PeerServerState,
  UpstreamConfig,
  DownstreamConfig,
  DownstreamConnection,
  PeerEventHandler,
  PeerStateHandler,
  PeerServerStateHandler,
  DownstreamConnectionHandler,
  PeerUnsubscribe,
} from "./Peer";

// Re-export EnvironmentEvent for convenience
export type { EnvironmentEvent } from "~/event";
