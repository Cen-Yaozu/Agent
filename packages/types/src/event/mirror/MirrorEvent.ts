/**
 * MirrorEvent - Request/Response events for Browser-Server communication
 *
 * These events enable the Mirror (browser) to request operations from Runtime (server)
 * and receive responses.
 *
 * Pattern:
 * ```
 * Browser (Mirror)                    Server (Runtime)
 * ─────────────────────────────────────────────────────────
 * container_create_request  ────────►  containers.create()
 *                          ◄────────  container_create_response
 *
 * agent_run_request        ────────►  agents.run()
 *                          ◄────────  agent_run_response
 *
 * image_snapshot_request   ────────►  images.snapshot()
 *                          ◄────────  image_snapshot_response
 * ```
 *
 * All MirrorEvents have:
 * - source: "mirror"
 * - category: "request" | "response"
 * - intent: "request" | "result"
 */

import type { SystemEvent } from "../base";
import type { ImageRecord } from "~/persistence";

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base interface for Mirror request events
 */
interface BaseMirrorRequestEvent<T extends string, D = unknown>
  extends SystemEvent<T, D, "mirror", "request", "request"> {}

/**
 * Base interface for Mirror response events
 */
interface BaseMirrorResponseEvent<T extends string, D = unknown>
  extends SystemEvent<T, D, "mirror", "response", "result"> {}

// ============================================================================
// Container Events
// ============================================================================

/**
 * Request to create a container
 */
export interface ContainerCreateRequestEvent extends BaseMirrorRequestEvent<"container_create_request", {
  requestId: string;
  containerId: string;
}> {}

/**
 * Response to container creation
 */
export interface ContainerCreateResponseEvent extends BaseMirrorResponseEvent<"container_create_response", {
  requestId: string;
  containerId: string;
  error?: string;
}> {}

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Request to run an agent
 */
export interface AgentRunRequestEvent extends BaseMirrorRequestEvent<"agent_run_request", {
  requestId: string;
  containerId: string;
  config: {
    name: string;
    systemPrompt?: string;
  };
}> {}

/**
 * Response to agent run
 */
export interface AgentRunResponseEvent extends BaseMirrorResponseEvent<"agent_run_response", {
  requestId: string;
  containerId: string;
  agentId?: string;
  error?: string;
}> {}

/**
 * Request to destroy an agent
 */
export interface AgentDestroyRequestEvent extends BaseMirrorRequestEvent<"agent_destroy_request", {
  containerId: string;
  agentId: string;
}> {}

/**
 * Notification that agent was destroyed
 */
export interface AgentDestroyedEvent extends BaseMirrorResponseEvent<"agent_destroyed", {
  containerId: string;
  agentId: string;
}> {}

/**
 * Request to stop an agent
 */
export interface AgentStopRequestEvent extends BaseMirrorRequestEvent<"agent_stop_request", {
  containerId: string;
  agentId: string;
}> {}

/**
 * Notification that agent was stopped
 */
export interface AgentStoppedEvent extends BaseMirrorResponseEvent<"agent_stopped", {
  containerId: string;
  agentId: string;
}> {}

/**
 * Request to resume an agent
 */
export interface AgentResumeRequestEvent extends BaseMirrorRequestEvent<"agent_resume_request", {
  containerId: string;
  agentId: string;
}> {}

/**
 * Notification that agent was resumed
 */
export interface AgentResumedEvent extends BaseMirrorResponseEvent<"agent_resumed", {
  containerId: string;
  agentId: string;
}> {}

/**
 * Request to send a message to an agent
 */
export interface UserMessageRequestEvent extends BaseMirrorRequestEvent<"user_message", {
  containerId: string;
  agentId: string;
  content: string;
}> {}

/**
 * Request to interrupt an agent
 */
export interface InterruptRequestEvent extends BaseMirrorRequestEvent<"interrupt_request", {
  containerId: string;
  agentId: string;
}> {}

// ============================================================================
// Image Events
// ============================================================================

/**
 * Request to snapshot an agent
 */
export interface ImageSnapshotRequestEvent extends BaseMirrorRequestEvent<"image_snapshot_request", {
  requestId: string;
  containerId: string;
  agentId: string;
}> {}

/**
 * Response to image snapshot
 */
export interface ImageSnapshotResponseEvent extends BaseMirrorResponseEvent<"image_snapshot_response", {
  requestId: string;
  record?: ImageRecord;
  error?: string;
}> {}

/**
 * Request to list all images
 */
export interface ImagesListRequestEvent extends BaseMirrorRequestEvent<"images_list_request", {
  requestId: string;
}> {}

/**
 * Response to images list
 */
export interface ImagesListResponseEvent extends BaseMirrorResponseEvent<"images_list_response", {
  requestId: string;
  records?: ImageRecord[];
  error?: string;
}> {}

/**
 * Request to get an image by ID
 */
export interface ImageGetRequestEvent extends BaseMirrorRequestEvent<"image_get_request", {
  requestId: string;
  imageId: string;
}> {}

/**
 * Response to image get
 */
export interface ImageGetResponseEvent extends BaseMirrorResponseEvent<"image_get_response", {
  requestId: string;
  record?: ImageRecord | null;
  error?: string;
}> {}

/**
 * Request to delete an image
 */
export interface ImageDeleteRequestEvent extends BaseMirrorRequestEvent<"image_delete_request", {
  imageId: string;
}> {}

/**
 * Request to resume an image
 */
export interface ImageResumeRequestEvent extends BaseMirrorRequestEvent<"image_resume_request", {
  requestId: string;
  imageId: string;
}> {}

/**
 * Response to image resume
 */
export interface ImageResumeResponseEvent extends BaseMirrorResponseEvent<"image_resume_response", {
  requestId: string;
  imageId: string;
  containerId?: string;
  agentId?: string;
  error?: string;
}> {}

// ============================================================================
// Union Types
// ============================================================================

/**
 * All Mirror request events
 */
export type MirrorRequestEvent =
  | ContainerCreateRequestEvent
  | AgentRunRequestEvent
  | AgentDestroyRequestEvent
  | AgentStopRequestEvent
  | AgentResumeRequestEvent
  | UserMessageRequestEvent
  | InterruptRequestEvent
  | ImageSnapshotRequestEvent
  | ImagesListRequestEvent
  | ImageGetRequestEvent
  | ImageDeleteRequestEvent
  | ImageResumeRequestEvent;

/**
 * All Mirror response events
 */
export type MirrorResponseEvent =
  | ContainerCreateResponseEvent
  | AgentRunResponseEvent
  | AgentDestroyedEvent
  | AgentStoppedEvent
  | AgentResumedEvent
  | ImageSnapshotResponseEvent
  | ImagesListResponseEvent
  | ImageGetResponseEvent
  | ImageResumeResponseEvent;

/**
 * All Mirror events (requests + responses)
 */
export type MirrorEvent = MirrorRequestEvent | MirrorResponseEvent;

/**
 * Mirror event type strings
 */
export type MirrorEventType = MirrorEvent["type"];

/**
 * Type guard: is this a MirrorEvent?
 */
export function isMirrorEvent(event: { source?: string }): event is MirrorEvent {
  return event.source === "mirror";
}

/**
 * Type guard: is this a Mirror request event?
 */
export function isMirrorRequestEvent(event: { source?: string; category?: string }): event is MirrorRequestEvent {
  return event.source === "mirror" && event.category === "request";
}

/**
 * Type guard: is this a Mirror response event?
 */
export function isMirrorResponseEvent(event: { source?: string; category?: string }): event is MirrorResponseEvent {
  return event.source === "mirror" && event.category === "response";
}
