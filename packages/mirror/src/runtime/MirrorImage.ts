/**
 * MirrorImage - Browser-side Image mirror
 *
 * Mirrors the server-side AgentImage and proxies operations via WebSocket events.
 */

import type { Peer, EnvironmentEvent, ImageRecord } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { MirrorAgent } from "./MirrorAgent";

const logger = createLogger("mirror/MirrorImage");

/**
 * Helper to create a Mirror request event
 */
function createMirrorRequest<T extends string, D>(type: T, data: D): EnvironmentEvent {
  return {
    type,
    timestamp: Date.now(),
    data,
    source: "mirror",
    category: "request",
    intent: "request",
  } as EnvironmentEvent;
}

/**
 * MirrorImage - Browser Image mirror
 *
 * Maintains local state that mirrors server-side AgentImage.
 */
export class MirrorImage {
  readonly imageId: string;
  readonly containerId: string;
  readonly agentId: string;
  readonly name: string;
  readonly description?: string;
  readonly systemPrompt?: string;
  readonly parentImageId?: string;
  readonly createdAt: number;

  private readonly peer: Peer;
  private readonly onAgentCreated: (agent: MirrorAgent) => void;
  private pendingResume: {
    resolve: (agent: MirrorAgent) => void;
    reject: (error: Error) => void;
  } | null = null;

  constructor(
    record: ImageRecord,
    peer: Peer,
    onAgentCreated: (agent: MirrorAgent) => void
  ) {
    this.imageId = record.imageId;
    this.containerId = record.containerId;
    this.agentId = record.agentId;
    this.name = record.name;
    this.description = record.description;
    this.systemPrompt = record.systemPrompt;
    this.parentImageId = record.parentImageId;
    this.createdAt = record.createdAt;
    this.peer = peer;
    this.onAgentCreated = onAgentCreated;

    // Listen for resume response
    this.peer.onUpstreamEvent((event) => {
      if (event.type === "image_resume_response") {
        this.handleResumeResponse(event);
      }
    });

    logger.debug("MirrorImage created", { imageId: this.imageId });
  }

  /**
   * Resume an agent from this image
   *
   * Sends image_resume_request to server and waits for image_resume_response.
   */
  async resume(): Promise<MirrorAgent> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.debug("Resuming image", { imageId: this.imageId });

    // Create promise for response
    const promise = new Promise<MirrorAgent>((resolve, reject) => {
      this.pendingResume = { resolve, reject };

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingResume) {
          this.pendingResume = null;
          reject(new Error("Image resume timeout"));
        }
      }, 30000);
    });

    // Send image_resume_request event to server
    this.peer.sendUpstream(createMirrorRequest("image_resume_request", {
      requestId,
      imageId: this.imageId,
    }));

    return promise;
  }

  /**
   * Handle image_resume_response event
   */
  private handleResumeResponse(event: EnvironmentEvent): void {
    const { imageId, agentId, containerId, error } = event.data as {
      imageId: string;
      agentId?: string;
      containerId?: string;
      error?: string;
    };

    // Ignore if not for this image
    if (imageId !== this.imageId) {
      return;
    }

    if (!this.pendingResume) {
      logger.warn("No pending resume for image_resume_response", { imageId });
      return;
    }

    const pending = this.pendingResume;
    this.pendingResume = null;

    if (error) {
      pending.reject(new Error(error));
      return;
    }

    if (!agentId || !containerId) {
      pending.reject(new Error("Invalid response: missing agentId or containerId"));
      return;
    }

    // Create MirrorAgent
    const agent = new MirrorAgent(agentId, containerId, this.peer);
    agent.setName(this.name);

    // Notify runtime to add agent to container
    this.onAgentCreated(agent);

    // Resolve promise
    pending.resolve(agent);

    logger.debug("Image resumed", { imageId: this.imageId, agentId });
  }

  /**
   * Convert to plain record
   */
  toRecord(): ImageRecord {
    return {
      imageId: this.imageId,
      containerId: this.containerId,
      agentId: this.agentId,
      name: this.name,
      description: this.description,
      systemPrompt: this.systemPrompt,
      messages: [], // Messages are stored on server
      parentImageId: this.parentImageId,
      createdAt: this.createdAt,
    };
  }
}
