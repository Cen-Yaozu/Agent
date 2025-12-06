/**
 * MirrorAgent - Browser-side Agent mirror
 *
 * Mirrors the server-side Agent state and proxies operations via WebSocket events.
 * Receives events from server and notifies local handlers.
 */

import type { Peer, EnvironmentEvent } from "@agentxjs/types";
import type { AgentState } from "@agentxjs/types/agent";
import type { Unsubscribe, AgentLifecycle } from "@agentxjs/types/runtime";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("mirror/MirrorAgent");

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

// Event handler type
type EventHandler = (event: EnvironmentEvent) => void;

/**
 * MirrorAgent - Browser Agent mirror
 *
 * Maintains local state that mirrors server-side Agent.
 */
export class MirrorAgent {
  readonly agentId: string;
  readonly containerId: string;

  private readonly peer: Peer;
  private readonly handlers = new Map<string, Set<EventHandler>>();
  private readonly allHandlers = new Set<EventHandler>();
  private _state: AgentState = "idle";
  private _lifecycle: AgentLifecycle = "running";
  private _name: string = "";

  constructor(agentId: string, containerId: string, peer: Peer) {
    this.agentId = agentId;
    this.containerId = containerId;
    this.peer = peer;

    logger.debug("MirrorAgent created", { agentId, containerId });
  }

  /**
   * Current agent state
   */
  get state(): AgentState {
    return this._state;
  }

  /**
   * Current lifecycle
   */
  get lifecycle(): AgentLifecycle {
    return this._lifecycle;
  }

  /**
   * Agent name
   */
  get name(): string {
    return this._name;
  }

  /**
   * Set agent name (called when syncing from server)
   */
  setName(name: string): void {
    this._name = name;
  }

  /**
   * Subscribe to all events
   */
  on(handler: EventHandler): Unsubscribe;
  /**
   * Subscribe to specific event type
   */
  on(type: string, handler: EventHandler): Unsubscribe;
  on(typeOrHandler: string | EventHandler, handler?: EventHandler): Unsubscribe {
    if (typeof typeOrHandler === "function") {
      // Subscribe to all events
      this.allHandlers.add(typeOrHandler);
      return () => {
        this.allHandlers.delete(typeOrHandler);
      };
    }

    // Subscribe to specific type
    const type = typeOrHandler;
    const h = handler!;
    let typeHandlers = this.handlers.get(type);
    if (!typeHandlers) {
      typeHandlers = new Set();
      this.handlers.set(type, typeHandlers);
    }
    typeHandlers.add(h);

    return () => {
      typeHandlers?.delete(h);
    };
  }

  /**
   * Send a message to the agent
   */
  async receive(message: string): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("Agent is destroyed");
    }

    if (this._lifecycle === "stopped") {
      throw new Error("Cannot send message to stopped agent");
    }

    logger.debug("Sending message", { agentId: this.agentId });

    // Send user_message event to server
    this.peer.sendUpstream(createMirrorRequest("user_message", {
      agentId: this.agentId,
      containerId: this.containerId,
      content: message,
    }));
  }

  /**
   * Interrupt current processing
   */
  interrupt(): void {
    this.peer.sendUpstream(createMirrorRequest("interrupt_request", {
      agentId: this.agentId,
      containerId: this.containerId,
    }));
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    this.peer.sendUpstream(createMirrorRequest("agent_stop_request", {
      agentId: this.agentId,
      containerId: this.containerId,
    }));
    this._lifecycle = "stopped";
  }

  /**
   * Resume the agent
   */
  async resume(): Promise<void> {
    if (this._lifecycle === "destroyed") {
      throw new Error("Cannot resume destroyed agent");
    }

    this.peer.sendUpstream(createMirrorRequest("agent_resume_request", {
      agentId: this.agentId,
      containerId: this.containerId,
    }));
    this._lifecycle = "running";
  }

  /**
   * Dispose the agent (local cleanup only)
   */
  dispose(): void {
    this._lifecycle = "destroyed";
    this.handlers.clear();
    this.allHandlers.clear();
    logger.debug("MirrorAgent disposed", { agentId: this.agentId });
  }

  /**
   * Handle event from server (called by MirrorContainer)
   */
  handleEvent(event: EnvironmentEvent): void {
    const eventType = event.type;

    // Update state based on event
    this.updateState(eventType);

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(eventType);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(event);
        } catch (err) {
          logger.error("Event handler error", { error: err, eventType });
        }
      }
    }

    // Notify all-event handlers
    for (const handler of this.allHandlers) {
      try {
        handler(event);
      } catch (err) {
        logger.error("All-event handler error", { error: err, eventType });
      }
    }
  }

  /**
   * Update internal state based on event type
   */
  private updateState(eventType: string): void {
    switch (eventType) {
      case "message_start":
        this._state = "thinking";
        break;
      case "text_delta":
        this._state = "responding";
        break;
      case "tool_call":
        this._state = "awaiting_tool_result";
        break;
      case "message_stop":
        this._state = "idle";
        break;
      case "agent_stopped":
        this._lifecycle = "stopped";
        break;
      case "agent_resumed":
        this._lifecycle = "running";
        break;
      case "agent_destroyed":
        this._lifecycle = "destroyed";
        break;
    }
  }
}
