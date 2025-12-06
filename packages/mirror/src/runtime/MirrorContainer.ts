/**
 * MirrorContainer - Browser-side Container mirror
 *
 * Mirrors the server-side Container state and proxies operations via WebSocket events.
 *
 * Architecture:
 * ```
 * Browser                          Server
 *   │                               │
 *   │  agent_run_request            │
 *   │  ─────────────────────────►   │  Container.run()
 *   │                               │
 *   │  ◄───────────────────────────  │  agent_run_response
 *   │     { agentId, ... }          │
 *   │                               │
 *   │  ◄═══════════════════════════ │  Agent events
 *   │     text_delta, tool_call...  │
 * ```
 */

import type { Peer, EnvironmentEvent } from "@agentxjs/types";
import { createLogger } from "@agentxjs/common";
import { MirrorAgent } from "./MirrorAgent";

const logger = createLogger("mirror/MirrorContainer");

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
 * Agent run configuration (matches server-side AgentRunConfig)
 */
export interface AgentRunConfig {
  name: string;
  systemPrompt?: string;
}

/**
 * MirrorContainer - Browser Container mirror
 *
 * Maintains local state that mirrors server-side Container.
 */
export class MirrorContainer {
  readonly containerId: string;

  private readonly peer: Peer;
  private readonly agents = new Map<string, MirrorAgent>();
  private readonly pendingRuns = new Map<string, {
    resolve: (agent: MirrorAgent) => void;
    reject: (error: Error) => void;
  }>();
  private _agentCount = 0;

  constructor(containerId: string, peer: Peer) {
    this.containerId = containerId;
    this.peer = peer;

    // Listen for events from server
    this.peer.onUpstreamEvent((event) => {
      this.handleServerEvent(event);
    });

    logger.debug("MirrorContainer created", { containerId });
  }

  /**
   * Get agent count
   */
  get agentCount(): number {
    return this._agentCount;
  }

  /**
   * Run an Agent with configuration
   *
   * Sends agent_run_request event to server and waits for agent_run_response.
   */
  async run(config: AgentRunConfig): Promise<MirrorAgent> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    logger.debug("Running agent", { containerId: this.containerId, name: config.name });

    // Create promise for response
    const promise = new Promise<MirrorAgent>((resolve, reject) => {
      this.pendingRuns.set(requestId, { resolve, reject });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRuns.has(requestId)) {
          this.pendingRuns.delete(requestId);
          reject(new Error("Agent creation timeout"));
        }
      }, 30000);
    });

    // Send agent_run_request event to server
    this.peer.sendUpstream(createMirrorRequest("agent_run_request", {
      requestId,
      containerId: this.containerId,
      config,
    }));

    return promise;
  }

  /**
   * Get an Agent by ID
   */
  get(agentId: string): MirrorAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Check if an Agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * List all Agents
   */
  list(): MirrorAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Destroy an Agent by ID
   */
  async destroy(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Send agent_destroy_request event to server
    this.peer.sendUpstream(createMirrorRequest("agent_destroy_request", {
      containerId: this.containerId,
      agentId,
    }));

    // Remove from local cache
    agent.dispose();
    this.agents.delete(agentId);
    this._agentCount = this.agents.size;

    logger.debug("Agent destroyed", { containerId: this.containerId, agentId });
    return true;
  }

  /**
   * Destroy all Agents
   */
  async destroyAll(): Promise<void> {
    for (const agentId of this.agents.keys()) {
      await this.destroy(agentId);
    }
  }

  /**
   * Dispose container
   */
  async dispose(): Promise<void> {
    await this.destroyAll();
    logger.debug("MirrorContainer disposed", { containerId: this.containerId });
  }

  /**
   * Add agent to local state (called when syncing from server)
   */
  addAgent(agent: MirrorAgent): void {
    this.agents.set(agent.agentId, agent);
    this._agentCount = this.agents.size;
  }

  /**
   * Remove agent from local state (called when syncing from server)
   */
  removeAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.dispose();
      this.agents.delete(agentId);
      this._agentCount = this.agents.size;
    }
  }

  /**
   * Handle events from server
   */
  private handleServerEvent(event: EnvironmentEvent): void {
    switch (event.type) {
      case "agent_run_response":
        this.handleAgentRunResponse(event);
        break;

      case "agent_destroyed":
        this.handleAgentDestroyed(event);
        break;

      case "text_delta":
      case "tool_call":
      case "tool_result":
      case "message_start":
      case "message_stop":
        this.forwardToAgent(event);
        break;

      default:
        // Forward other events to appropriate agent
        this.forwardToAgent(event);
    }
  }

  /**
   * Handle agent_run_response event
   */
  private handleAgentRunResponse(event: EnvironmentEvent): void {
    const { requestId, agentId, containerId, error } = event.data as {
      requestId: string;
      agentId?: string;
      containerId: string;
      error?: string;
    };

    // Ignore if not for this container
    if (containerId !== this.containerId) {
      return;
    }

    const pending = this.pendingRuns.get(requestId);
    if (!pending) {
      logger.warn("No pending run for agent_run_response", { requestId, agentId });
      return;
    }

    this.pendingRuns.delete(requestId);

    if (error) {
      pending.reject(new Error(error));
      return;
    }

    if (!agentId) {
      pending.reject(new Error("No agentId in response"));
      return;
    }

    // Create MirrorAgent and add to local state
    const agent = new MirrorAgent(agentId, this.containerId, this.peer);
    this.addAgent(agent);

    // Resolve promise
    pending.resolve(agent);

    logger.debug("Agent created", { containerId: this.containerId, agentId });
  }

  /**
   * Handle agent_destroyed event (server-initiated)
   */
  private handleAgentDestroyed(event: EnvironmentEvent): void {
    const { agentId, containerId } = event.data as {
      agentId: string;
      containerId: string;
    };

    if (containerId !== this.containerId) {
      return;
    }

    this.removeAgent(agentId);
    logger.debug("Agent destroyed (server)", { containerId, agentId });
  }

  /**
   * Forward event to the appropriate agent
   */
  private forwardToAgent(event: EnvironmentEvent): void {
    const agentId = (event.data as { agentId?: string })?.agentId;
    if (!agentId) {
      return;
    }

    const agent = this.agents.get(agentId);
    if (agent) {
      agent.handleEvent(event);
    }
  }
}
