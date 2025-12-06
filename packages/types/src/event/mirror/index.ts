/**
 * Mirror Events - Request/Response events for Browser-Server communication
 */

export type {
  // Container events
  ContainerCreateRequestEvent,
  ContainerCreateResponseEvent,
  // Agent events
  AgentRunRequestEvent,
  AgentRunResponseEvent,
  AgentDestroyRequestEvent,
  AgentDestroyedEvent,
  AgentStopRequestEvent,
  AgentStoppedEvent,
  AgentResumeRequestEvent,
  AgentResumedEvent,
  UserMessageRequestEvent,
  InterruptRequestEvent,
  // Image events
  ImageSnapshotRequestEvent,
  ImageSnapshotResponseEvent,
  ImagesListRequestEvent,
  ImagesListResponseEvent,
  ImageGetRequestEvent,
  ImageGetResponseEvent,
  ImageDeleteRequestEvent,
  ImageResumeRequestEvent,
  ImageResumeResponseEvent,
  // Union types
  MirrorRequestEvent,
  MirrorResponseEvent,
  MirrorEvent,
  MirrorEventType,
} from "./MirrorEvent";

export {
  isMirrorEvent,
  isMirrorRequestEvent,
  isMirrorResponseEvent,
} from "./MirrorEvent";
