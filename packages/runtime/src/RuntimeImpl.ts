/**
 * RuntimeImpl - Runtime implementation (thin layer)
 *
 * APIs are thin routing layers. Business logic lives in objects:
 * - Container manages agents
 * - Agent manages sessions
 * - Image manages snapshots
 */

import type { Persistence } from "@agentxjs/types";
import type {
  Runtime,
  ContainersAPI,
  AgentsAPI,
  ImagesAPI,
  EventsAPI,
  Container,
  Unsubscribe,
  RuntimeEventHandler,
  ClaudeLLMConfig,
  LLMProvider,
  AgentImage,
  ImageMessage,
} from "@agentxjs/types/runtime";
import type { Agent, AgentConfig } from "@agentxjs/types/runtime";
import type { Message } from "@agentxjs/types/agent";
import type { Environment } from "@agentxjs/types/runtime/internal";
import type { RuntimeConfig } from "./createRuntime";
import type { RuntimeImageContext, RuntimeContainerContext } from "./internal";
import {
  SystemBusImpl,
  RuntimeAgent,
  RuntimeAgentImage,
  RuntimeContainer,
} from "./internal";
import { ClaudeEnvironment } from "./environment";
import { createLogger } from "@agentxjs/common";
import { homedir } from "node:os";
import { join } from "node:path";

const logger = createLogger("runtime/RuntimeImpl");

/**
 * RuntimeImpl - Implementation of Runtime interface
 */
export class RuntimeImpl implements Runtime {
  readonly containers: ContainersAPI;
  readonly agents: AgentsAPI;
  readonly images: ImagesAPI;
  readonly events: EventsAPI;

  private readonly persistence: Persistence;
  private readonly llmProvider: LLMProvider<ClaudeLLMConfig>;
  private readonly bus: SystemBusImpl;
  private readonly environment: Environment;
  private readonly basePath: string;

  /** Container registry: containerId -> RuntimeContainer */
  private readonly containerRegistry = new Map<string, RuntimeContainer>();

  /** Event handlers */
  private readonly eventHandlers = new Map<string, Set<RuntimeEventHandler>>();
  private readonly allEventHandlers = new Set<RuntimeEventHandler>();

  constructor(config: RuntimeConfig) {
    logger.info("RuntimeImpl constructor start");
    this.persistence = config.persistence;
    this.llmProvider = config.llmProvider;
    this.basePath = join(homedir(), ".agentx");

    // Create SystemBus
    logger.info("Creating SystemBus");
    this.bus = new SystemBusImpl();

    // Subscribe bus events to runtime events
    this.bus.onAny((event) => {
      this.emit(event as { type: string });
    });

    // Use custom environment or create ClaudeEnvironment from LLMProvider
    if (config.environment) {
      logger.info("Using custom Environment");
      this.environment = config.environment;
    } else {
      logger.info("Creating ClaudeEnvironment");
      const llmConfig = this.llmProvider.provide();
      this.environment = new ClaudeEnvironment({
        apiKey: llmConfig.apiKey,
        baseUrl: llmConfig.baseUrl,
        model: llmConfig.model,
      });
    }
    logger.info("Connecting Environment to bus");
    this.environment.receptor.emit(this.bus);
    this.environment.effector.subscribe(this.bus);

    // Initialize APIs
    logger.info("Creating APIs");
    this.containers = this.createContainersAPI();
    this.agents = this.createAgentsAPI();
    this.images = this.createImagesAPI();
    this.events = this.createEventsAPI();
    logger.info("RuntimeImpl constructor done");
  }

  // ==================== Container Context ====================

  private createContainerContext(): RuntimeContainerContext {
    return {
      persistence: this.persistence,
      bus: this.bus,
      environment: this.environment,
      basePath: this.basePath,
      onDisposed: (containerId) => {
        this.containerRegistry.delete(containerId);
      },
    };
  }

  // ==================== Containers API (thin layer) ====================

  private createContainersAPI(): ContainersAPI {
    return {
      create: async (containerId: string): Promise<Container> => {
        // Check if already in memory
        const existing = this.containerRegistry.get(containerId);
        if (existing) return existing;

        // Try to load from persistence
        const loaded = await RuntimeContainer.load(containerId, this.createContainerContext());
        if (loaded) {
          this.containerRegistry.set(containerId, loaded);
          return loaded;
        }

        // Create new container
        const container = await RuntimeContainer.create(containerId, this.createContainerContext());
        this.containerRegistry.set(containerId, container);
        return container;
      },

      get: (containerId: string): Container | undefined => {
        return this.containerRegistry.get(containerId);
      },

      list: (): Container[] => {
        return Array.from(this.containerRegistry.values());
      },
    };
  }

  // ==================== Agents API (thin layer) ====================

  private createAgentsAPI(): AgentsAPI {
    return {
      run: async (containerId: string, config: AgentConfig): Promise<Agent> => {
        const container = this.containerRegistry.get(containerId);
        if (!container) {
          throw new Error(`Container not found: ${containerId}`);
        }
        return container.runAgent(config);
      },

      get: (agentId: string): Agent | undefined => {
        for (const container of this.containerRegistry.values()) {
          const agent = container.getAgent(agentId);
          if (agent) return agent;
        }
        return undefined;
      },

      list: (containerId: string): Agent[] => {
        const container = this.containerRegistry.get(containerId);
        return container?.listAgents() ?? [];
      },

      destroy: async (agentId: string): Promise<boolean> => {
        for (const container of this.containerRegistry.values()) {
          const agent = container.getAgent(agentId);
          if (agent) {
            return container.destroyAgent(agentId);
          }
        }
        return false;
      },

      destroyAll: async (containerId: string): Promise<void> => {
        const container = this.containerRegistry.get(containerId);
        await container?.destroyAllAgents();
      },
    };
  }

  // ==================== Images API ====================

  /**
   * Create RuntimeImageContext for RuntimeAgentImage
   */
  private createImageContext(): RuntimeImageContext {
    return {
      createAgentWithMessages: async (
        containerId: string,
        config: { name: string; description?: string; systemPrompt?: string },
        messages: Message[]
      ): Promise<Agent> => {
        // Only get container from registry (not from persistence)
        // This ensures disposed containers cannot be resumed
        const container = this.containerRegistry.get(containerId);
        if (!container) {
          throw new Error(`Container not found: ${containerId}`);
        }
        return container.runAgentWithMessages(config, messages);
      },
      imageRepository: this.persistence.images,
    };
  }

  private createImagesAPI(): ImagesAPI {
    const imageContext = this.createImageContext();

    return {
      snapshot: async (agent: Agent): Promise<AgentImage> => {
        // Verify it's a RuntimeAgent
        if (!(agent instanceof RuntimeAgent)) {
          throw new Error("Agent must be a RuntimeAgent instance");
        }
        return RuntimeAgentImage.snapshot(agent, imageContext);
      },

      list: async (): Promise<AgentImage[]> => {
        const records = await this.persistence.images.findAllImages();
        return records.map(
          (record) =>
            new RuntimeAgentImage(
              {
                imageId: record.imageId,
                containerId: record.containerId,
                agentId: record.agentId,
                name: record.name,
                description: record.description,
                systemPrompt: record.systemPrompt,
                messages: record.messages as unknown as ImageMessage[],
                parentImageId: record.parentImageId,
                createdAt: record.createdAt,
              },
              imageContext
            )
        );
      },

      get: async (imageId: string): Promise<AgentImage | null> => {
        const record = await this.persistence.images.findImageById(imageId);
        if (!record) return null;
        return new RuntimeAgentImage(
          {
            imageId: record.imageId,
            containerId: record.containerId,
            agentId: record.agentId,
            name: record.name,
            description: record.description,
            systemPrompt: record.systemPrompt,
            messages: record.messages as unknown as ImageMessage[],
            parentImageId: record.parentImageId,
            createdAt: record.createdAt,
          },
          imageContext
        );
      },

      delete: async (imageId: string): Promise<void> => {
        await this.persistence.images.deleteImage(imageId);
      },
    };
  }

  // ==================== Events API ====================

  private createEventsAPI(): EventsAPI {
    return {
      on: <T extends string>(type: T, handler: RuntimeEventHandler): Unsubscribe => {
        let handlers = this.eventHandlers.get(type);
        if (!handlers) {
          handlers = new Set();
          this.eventHandlers.set(type, handlers);
        }
        handlers.add(handler);

        return () => {
          handlers?.delete(handler);
        };
      },

      onAll: (handler: RuntimeEventHandler): Unsubscribe => {
        this.allEventHandlers.add(handler);
        return () => {
          this.allEventHandlers.delete(handler);
        };
      },
    };
  }

  /**
   * Emit event to handlers
   */
  private emit(event: { type: string; [key: string]: unknown }): void {
    // Type-specific handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }

    // All-event handlers
    for (const handler of this.allEventHandlers) {
      handler(event);
    }
  }

  // ==================== Lifecycle ====================

  async dispose(): Promise<void> {
    logger.info("Disposing RuntimeImpl");

    // Dispose all containers (which destroys all agents)
    for (const container of this.containerRegistry.values()) {
      await container.dispose();
    }

    // Dispose environment (if it has a dispose method)
    if ("dispose" in this.environment && typeof this.environment.dispose === "function") {
      (this.environment as { dispose: () => void }).dispose();
    }

    // Destroy bus
    this.bus.destroy();

    // Clear all state
    this.containerRegistry.clear();
    this.eventHandlers.clear();
    this.allEventHandlers.clear();

    logger.info("RuntimeImpl disposed");
  }
}
