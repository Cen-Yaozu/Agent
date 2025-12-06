/**
 * MirrorRuntime - Browser-side Runtime mirror
 *
 * Mirrors the server-side Runtime state and proxies operations via WebSocket events.
 * Provides the same API structure as Runtime: containers, agents, images.
 *
 * Architecture:
 * ```
 *   Server (Runtime)
 *        ▲
 *        │ WebSocket (Peer)
 *        ▼
 *   ┌─────────────────────────────┐
 *   │       MirrorRuntime         │
 *   │                             │
 *   │  ┌───────────────────────┐  │
 *   │  │   PeerEnvironment     │  │
 *   │  │  (Receptor+Effector)  │  │
 *   │  └───────────┬───────────┘  │
 *   │              │              │
 *   │  ┌───────────▼───────────┐  │
 *   │  │     SystemBus         │  │
 *   │  └───────────┬───────────┘  │
 *   │              │              │
 *   │  ┌───────────▼───────────┐  │
 *   │  │  containers (Mirror)  │  │
 *   │  │  agents (Mirror)      │  │
 *   │  │  images (Mirror)      │  │
 *   │  └───────────────────────┘  │
 *   └─────────────────────────────┘
 * ```
 */

import type { Peer, EnvironmentEvent, ImageRecord } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { SystemBusImpl } from "./SystemBusImpl";
import { MirrorContainer, type AgentRunConfig } from "./MirrorContainer";
import { MirrorAgent } from "./MirrorAgent";
import { MirrorImage } from "./MirrorImage";
import { PeerEnvironment } from "../environment";

const logger = createLogger("mirror/MirrorRuntime");

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
 * MirrorRuntime configuration
 */
export interface MirrorRuntimeConfig {
  /**
   * WebSocket server URL (used with connect())
   */
  serverUrl?: string;

  /**
   * WebSocket peer for network communication
   */
  peer?: Peer;

  /**
   * Custom environment (for testing)
   */
  environment?: PeerEnvironment;
}

/**
 * MirrorContainersAPI - Container operations
 */
class MirrorContainersAPI {
  private readonly containers = new Map<string, MirrorContainer>();
  private readonly peer: Peer;
  private readonly pendingCreates = new Map<string, {
    resolve: (container: MirrorContainer) => void;
    reject: (error: Error) => void;
  }>();

  constructor(peer: Peer) {
    this.peer = peer;

    // Listen for container events
    this.peer.onUpstreamEvent((event) => {
      if (event.type === "container_create_response") {
        this.handleCreateResponse(event);
      }
    });
  }

  /**
   * Create a new container
   */
  async create(containerId: string): Promise<MirrorContainer> {
    // Check cache first
    const existing = this.containers.get(containerId);
    if (existing) {
      return existing;
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create promise for response
    const promise = new Promise<MirrorContainer>((resolve, reject) => {
      this.pendingCreates.set(requestId, { resolve, reject });

      setTimeout(() => {
        if (this.pendingCreates.has(requestId)) {
          this.pendingCreates.delete(requestId);
          reject(new Error("Container creation timeout"));
        }
      }, 30000);
    });

    // Send request
    this.peer.sendUpstream(createMirrorRequest("container_create_request", { requestId, containerId }));

    return promise;
  }

  /**
   * Get container by ID
   */
  get(containerId: string): MirrorContainer | undefined {
    return this.containers.get(containerId);
  }

  /**
   * List all containers
   */
  list(): MirrorContainer[] {
    return Array.from(this.containers.values());
  }

  /**
   * Add container to local state
   */
  addContainer(container: MirrorContainer): void {
    this.containers.set(container.containerId, container);
  }

  /**
   * Remove container from local state
   */
  removeContainer(containerId: string): void {
    const container = this.containers.get(containerId);
    if (container) {
      container.dispose();
      this.containers.delete(containerId);
    }
  }

  private handleCreateResponse(event: EnvironmentEvent): void {
    const { requestId, containerId, error } = event.data as {
      requestId: string;
      containerId: string;
      error?: string;
    };

    const pending = this.pendingCreates.get(requestId);
    if (!pending) {
      return;
    }

    this.pendingCreates.delete(requestId);

    if (error) {
      pending.reject(new Error(error));
      return;
    }

    const container = new MirrorContainer(containerId, this.peer);
    this.addContainer(container);
    pending.resolve(container);

    logger.debug("Container created", { containerId });
  }

  dispose(): void {
    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();
  }
}

/**
 * MirrorAgentsAPI - Agent operations (cross-container)
 */
class MirrorAgentsAPI {
  private readonly containersAPI: MirrorContainersAPI;

  constructor(_peer: Peer, containersAPI: MirrorContainersAPI) {
    this.containersAPI = containersAPI;
  }

  /**
   * Run an agent in a container
   */
  async run(containerId: string, config: AgentRunConfig): Promise<MirrorAgent> {
    let container = this.containersAPI.get(containerId);
    if (!container) {
      // Auto-create container if not exists
      container = await this.containersAPI.create(containerId);
    }
    return container.run(config);
  }

  /**
   * Get agent by ID (searches all containers)
   */
  get(agentId: string): MirrorAgent | undefined {
    for (const container of this.containersAPI.list()) {
      const agent = container.get(agentId);
      if (agent) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * List agents in a container
   */
  list(containerId: string): MirrorAgent[] {
    const container = this.containersAPI.get(containerId);
    return container ? container.list() : [];
  }

  /**
   * Destroy an agent
   */
  async destroy(agentId: string): Promise<boolean> {
    for (const container of this.containersAPI.list()) {
      if (container.has(agentId)) {
        return container.destroy(agentId);
      }
    }
    return false;
  }

  /**
   * Destroy all agents in a container
   */
  async destroyAll(containerId: string): Promise<void> {
    const container = this.containersAPI.get(containerId);
    if (container) {
      await container.destroyAll();
    }
  }
}

/**
 * MirrorImagesAPI - Image operations
 */
class MirrorImagesAPI {
  private readonly images = new Map<string, MirrorImage>();
  private readonly peer: Peer;
  private readonly containersAPI: MirrorContainersAPI;
  private readonly pendingSnapshots = new Map<string, {
    resolve: (image: MirrorImage) => void;
    reject: (error: Error) => void;
  }>();
  private readonly pendingLists = new Map<string, {
    resolve: (images: MirrorImage[]) => void;
    reject: (error: Error) => void;
  }>();

  constructor(peer: Peer, containersAPI: MirrorContainersAPI) {
    this.peer = peer;
    this.containersAPI = containersAPI;

    // Listen for image events
    this.peer.onUpstreamEvent((event) => {
      switch (event.type) {
        case "image_snapshot_response":
          this.handleSnapshotResponse(event);
          break;
        case "images_list_response":
          this.handleListResponse(event);
          break;
      }
    });
  }

  /**
   * Snapshot an agent to create an image
   */
  async snapshot(agent: MirrorAgent): Promise<MirrorImage> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const promise = new Promise<MirrorImage>((resolve, reject) => {
      this.pendingSnapshots.set(requestId, { resolve, reject });

      setTimeout(() => {
        if (this.pendingSnapshots.has(requestId)) {
          this.pendingSnapshots.delete(requestId);
          reject(new Error("Snapshot timeout"));
        }
      }, 30000);
    });

    this.peer.sendUpstream(createMirrorRequest("image_snapshot_request", {
      requestId,
      agentId: agent.agentId,
      containerId: agent.containerId,
    }));

    return promise;
  }

  /**
   * List all images
   */
  async list(): Promise<MirrorImage[]> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const promise = new Promise<MirrorImage[]>((resolve, reject) => {
      this.pendingLists.set(requestId, { resolve, reject });

      setTimeout(() => {
        if (this.pendingLists.has(requestId)) {
          this.pendingLists.delete(requestId);
          reject(new Error("List images timeout"));
        }
      }, 30000);
    });

    this.peer.sendUpstream(createMirrorRequest("images_list_request", { requestId }));

    return promise;
  }

  /**
   * Get image by ID (from local cache)
   */
  get(imageId: string): MirrorImage | undefined {
    return this.images.get(imageId);
  }

  /**
   * Delete an image
   */
  async delete(imageId: string): Promise<void> {
    this.peer.sendUpstream(createMirrorRequest("image_delete_request", { imageId }));
    this.images.delete(imageId);
  }

  private handleSnapshotResponse(event: EnvironmentEvent): void {
    const { requestId, record, error } = event.data as {
      requestId: string;
      record?: ImageRecord;
      error?: string;
    };

    const pending = this.pendingSnapshots.get(requestId);
    if (!pending) {
      return;
    }

    this.pendingSnapshots.delete(requestId);

    if (error) {
      pending.reject(new Error(error));
      return;
    }

    if (!record) {
      pending.reject(new Error("No image record in response"));
      return;
    }

    const image = this.createMirrorImage(record);
    this.images.set(image.imageId, image);
    pending.resolve(image);

    logger.debug("Image created", { imageId: image.imageId });
  }

  private handleListResponse(event: EnvironmentEvent): void {
    const { requestId, records, error } = event.data as {
      requestId: string;
      records?: ImageRecord[];
      error?: string;
    };

    const pending = this.pendingLists.get(requestId);
    if (!pending) {
      return;
    }

    this.pendingLists.delete(requestId);

    if (error) {
      pending.reject(new Error(error));
      return;
    }

    const images = (records ?? []).map((record) => {
      let image = this.images.get(record.imageId);
      if (!image) {
        image = this.createMirrorImage(record);
        this.images.set(image.imageId, image);
      }
      return image;
    });

    pending.resolve(images);
  }

  private createMirrorImage(record: ImageRecord): MirrorImage {
    return new MirrorImage(record, this.peer, (agent) => {
      // Add agent to container when resumed
      const container = this.containersAPI.get(agent.containerId);
      if (container) {
        container.addAgent(agent);
      }
    });
  }

  dispose(): void {
    this.images.clear();
  }
}

/**
 * MirrorRuntime - Browser-side Runtime mirror
 */
export class MirrorRuntime {
  readonly containers: MirrorContainersAPI;
  readonly agents: MirrorAgentsAPI;
  readonly images: MirrorImagesAPI;

  private readonly bus: SystemBusImpl;
  private peer: Peer | null = null;
  private peerEnvironment: PeerEnvironment | null = null;

  constructor(config: MirrorRuntimeConfig = {}) {
    this.bus = new SystemBusImpl();
    this.peer = config.peer ?? null;

    if (!this.peer) {
      throw new Error("Peer is required for MirrorRuntime");
    }

    // Create API instances
    this.containers = new MirrorContainersAPI(this.peer);
    this.agents = new MirrorAgentsAPI(this.peer, this.containers);
    this.images = new MirrorImagesAPI(this.peer, this.containers);

    // Setup environment
    if (config.environment) {
      this.connectEnvironment(config.environment);
    } else {
      this.setupPeerEnvironment(this.peer);
    }

    logger.debug("MirrorRuntime created");
  }

  private setupPeerEnvironment(peer: Peer): void {
    this.peerEnvironment = new PeerEnvironment({ peer });
    this.connectEnvironment(this.peerEnvironment);
  }

  private connectEnvironment(env: PeerEnvironment): void {
    env.receptor.emit(this.bus);
    env.effector.subscribe(this.bus);
    logger.debug("Environment connected to bus");
  }

  /**
   * Subscribe to all runtime events
   */
  on(handler: (event: EnvironmentEvent) => void): () => void {
    return this.bus.onAny((event: { type: string }) => {
      handler(event as EnvironmentEvent);
    });
  }

  /**
   * Dispose the runtime
   */
  async dispose(): Promise<void> {
    logger.info("Disposing MirrorRuntime");

    this.containers.dispose();
    this.images.dispose();

    if (this.peerEnvironment) {
      this.peerEnvironment.dispose();
      this.peerEnvironment = null;
    }

    if (this.peer) {
      this.peer.disconnectUpstream();
    }

    this.bus.destroy();
  }

  /**
   * Get the WebSocket peer
   */
  getPeer(): Peer | null {
    return this.peer;
  }
}

/**
 * Create a MirrorRuntime
 */
export function createMirrorRuntime(config: MirrorRuntimeConfig): MirrorRuntime {
  return new MirrorRuntime(config);
}
