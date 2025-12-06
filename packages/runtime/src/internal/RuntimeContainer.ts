/**
 * RuntimeContainer - Container implementation with agent management
 *
 * Container is an object with behavior. It manages agents internally.
 * API layer (ContainersAPI) is just a thin routing layer.
 */

import type { Container, Agent, AgentConfig } from "@agentxjs/types/runtime";
import type { Persistence, ContainerRecord } from "@agentxjs/types";
import type { Message } from "@agentxjs/types/agent";
import type { SystemBus, Environment } from "@agentxjs/types/runtime/internal";
import { RuntimeAgent } from "./RuntimeAgent";
import { RuntimeSession } from "./RuntimeSession";
import { RuntimeSandbox } from "./RuntimeSandbox";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("runtime/RuntimeContainer");

/**
 * Context needed by RuntimeContainer to operate
 */
export interface RuntimeContainerContext {
  persistence: Persistence;
  bus: SystemBus;
  environment: Environment;
  basePath: string;
  /** Callback when container is disposed */
  onDisposed?: (containerId: string) => void;
}

/**
 * RuntimeContainer - Full Container implementation
 */
export class RuntimeContainer implements Container {
  readonly containerId: string;
  readonly createdAt: number;

  private readonly agents = new Map<string, RuntimeAgent>();
  private readonly context: RuntimeContainerContext;

  private constructor(
    containerId: string,
    createdAt: number,
    context: RuntimeContainerContext
  ) {
    this.containerId = containerId;
    this.createdAt = createdAt;
    this.context = context;
  }

  /**
   * Create a new container and persist it
   */
  static async create(
    containerId: string,
    context: RuntimeContainerContext
  ): Promise<RuntimeContainer> {
    const now = Date.now();

    // Persist container record
    const record: ContainerRecord = {
      containerId,
      createdAt: now,
      updatedAt: now,
    };
    await context.persistence.containers.saveContainer(record);

    const container = new RuntimeContainer(containerId, now, context);

    // Emit container_created event
    context.bus.emit({
      type: "container_created",
      timestamp: now,
      source: "container",
      category: "lifecycle",
      intent: "notification",
      data: {
        containerId,
        createdAt: now,
      },
      context: {
        containerId,
      },
    });

    logger.info("Container created", { containerId });
    return container;
  }

  /**
   * Load an existing container from persistence
   */
  static async load(
    containerId: string,
    context: RuntimeContainerContext
  ): Promise<RuntimeContainer | null> {
    const record = await context.persistence.containers.findContainerById(containerId);
    if (!record) return null;

    logger.info("Container loaded", { containerId });
    return new RuntimeContainer(containerId, record.createdAt, context);
  }

  // ==================== Agent Lifecycle ====================

  async runAgent(config: AgentConfig): Promise<Agent> {
    const agentId = this.generateId();
    const sessionId = this.generateId();

    // Create and initialize Sandbox
    const sandbox = new RuntimeSandbox({
      agentId,
      containerId: this.containerId,
      basePath: this.context.basePath,
    });
    await sandbox.initialize();

    // Create Session
    const session = new RuntimeSession({
      sessionId,
      agentId,
      containerId: this.containerId,
      repository: this.context.persistence.sessions,
      bus: this.context.bus,
    });
    await session.initialize();

    // Create RuntimeAgent
    const agent = new RuntimeAgent({
      agentId,
      containerId: this.containerId,
      config,
      bus: this.context.bus,
      sandbox,
      session,
    });

    // Register agent
    this.agents.set(agentId, agent);

    // Emit agent_registered event
    this.context.bus.emit({
      type: "agent_registered",
      timestamp: Date.now(),
      source: "container",
      category: "lifecycle",
      intent: "notification",
      data: {
        containerId: this.containerId,
        agentId,
        definitionName: config.name,
        registeredAt: Date.now(),
      },
      context: {
        containerId: this.containerId,
        agentId,
      },
    });

    logger.info("Agent created in container", { containerId: this.containerId, agentId });
    return agent;
  }

  /**
   * Run agent with pre-loaded messages (used by image resume)
   */
  async runAgentWithMessages(config: AgentConfig, messages: Message[]): Promise<Agent> {
    const agentId = this.generateId();
    const sessionId = this.generateId();

    // Create and initialize Sandbox
    const sandbox = new RuntimeSandbox({
      agentId,
      containerId: this.containerId,
      basePath: this.context.basePath,
    });
    await sandbox.initialize();

    // Create Session
    const session = new RuntimeSession({
      sessionId,
      agentId,
      containerId: this.containerId,
      repository: this.context.persistence.sessions,
      bus: this.context.bus,
    });
    await session.initialize();

    // Pre-load messages into session
    for (const message of messages) {
      await session.addMessage(message);
    }

    // Create RuntimeAgent
    const agent = new RuntimeAgent({
      agentId,
      containerId: this.containerId,
      config,
      bus: this.context.bus,
      sandbox,
      session,
    });

    // Register agent
    this.agents.set(agentId, agent);

    // Emit agent_registered event
    this.context.bus.emit({
      type: "agent_registered",
      timestamp: Date.now(),
      source: "container",
      category: "lifecycle",
      intent: "notification",
      data: {
        containerId: this.containerId,
        agentId,
        definitionName: config.name,
        registeredAt: Date.now(),
        resumedFromImage: true,
      },
      context: {
        containerId: this.containerId,
        agentId,
      },
    });

    logger.info("Agent resumed in container", { containerId: this.containerId, agentId });
    return agent;
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  get agentCount(): number {
    return this.agents.size;
  }

  async destroyAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Call agent's destroy
    await agent.destroy();

    // Remove from registry
    this.agents.delete(agentId);

    // Emit agent_unregistered event
    this.context.bus.emit({
      type: "agent_unregistered",
      timestamp: Date.now(),
      source: "container",
      category: "lifecycle",
      intent: "notification",
      data: {
        containerId: this.containerId,
        agentId,
      },
      context: {
        containerId: this.containerId,
        agentId,
      },
    });

    logger.info("Agent destroyed", { containerId: this.containerId, agentId });
    return true;
  }

  async destroyAllAgents(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      await this.destroyAgent(agentId);
    }
  }

  // ==================== Container Lifecycle ====================

  async dispose(): Promise<void> {
    const agentCount = this.agents.size;

    // Destroy all agents
    await this.destroyAllAgents();

    // Emit container_destroyed event
    this.context.bus.emit({
      type: "container_destroyed",
      timestamp: Date.now(),
      source: "container",
      category: "lifecycle",
      intent: "notification",
      data: {
        containerId: this.containerId,
        agentCount,
      },
      context: {
        containerId: this.containerId,
      },
    });

    // Notify runtime that this container is disposed
    this.context.onDisposed?.(this.containerId);

    logger.info("Container disposed", { containerId: this.containerId, agentCount });
    // Note: Container record stays in persistence (dispose != delete)
  }

  // ==================== Private Helpers ====================

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }
}
