/**
 * ImageManagerImpl - Implementation of ImageManager
 *
 * Part of Docker-style layered architecture:
 * Definition → [auto] → MetaImage → Session → [commit] → DerivedImage
 *
 * This implementation uses Repository for persistence and agentFactory for
 * creating agents from images (like `docker run`).
 */

import type {
  ImageManager,
  AgentImage,
  MetaImage,
  Repository,
  ImageRecord,
  AgentDefinition,
  Agent,
} from "@deepractice-ai/agentx-types";
import { createLogger } from "@deepractice-ai/agentx-logger";

const logger = createLogger("agentx/ImageManager");

/**
 * Generate MetaImage ID from definition name
 */
function generateMetaImageId(definitionName: string): string {
  return `meta_${definitionName}`;
}

/**
 * Convert ImageRecord to AgentImage
 */
function toAgentImage(record: ImageRecord): AgentImage {
  const definition = record.definition as unknown as AgentDefinition;

  if (record.type === "meta") {
    const metaImage: MetaImage = {
      type: "meta",
      imageId: record.imageId,
      definitionName: record.definitionName,
      definition,
      config: record.config,
      messages: [] as const,
      createdAt: record.createdAt,
    };
    return metaImage;
  } else {
    return {
      type: "derived",
      imageId: record.imageId,
      parentImageId: record.parentImageId!,
      definitionName: record.definitionName,
      definition,
      config: record.config,
      messages: record.messages as unknown as AgentImage["messages"],
      createdAt: record.createdAt,
    } as AgentImage;
  }
}

/**
 * Agent factory type for creating agents from definition and config
 */
type AgentFactory = (definition: AgentDefinition, config: Record<string, unknown>) => Agent;

/**
 * ImageManager implementation using Repository
 */
export class ImageManagerImpl implements ImageManager {
  constructor(
    private readonly repository: Repository,
    private readonly agentFactory?: AgentFactory
  ) {}

  async get(imageId: string): Promise<AgentImage | undefined> {
    const record = await this.repository.findImageById(imageId);
    if (!record) {
      return undefined;
    }
    return toAgentImage(record);
  }

  async getMetaImage(definitionName: string): Promise<MetaImage | undefined> {
    const metaImageId = generateMetaImageId(definitionName);
    const record = await this.repository.findImageById(metaImageId);

    if (!record || record.type !== "meta") {
      return undefined;
    }

    return toAgentImage(record) as MetaImage;
  }

  async list(): Promise<AgentImage[]> {
    const records = await this.repository.findAllImages();
    return records.map(toAgentImage);
  }

  async listByDefinition(definitionName: string): Promise<AgentImage[]> {
    const allRecords = await this.repository.findAllImages();
    const filtered = allRecords.filter((r) => r.definitionName === definitionName);
    return filtered.map(toAgentImage);
  }

  async exists(imageId: string): Promise<boolean> {
    return this.repository.imageExists(imageId);
  }

  async delete(imageId: string): Promise<boolean> {
    // Check if image exists and is not MetaImage
    const record = await this.repository.findImageById(imageId);
    if (!record) {
      return false;
    }

    if (record.type === "meta") {
      logger.warn("Cannot delete MetaImage directly", { imageId });
      return false;
    }

    await this.repository.deleteImage(imageId);
    logger.info("Image deleted", { imageId });
    return true;
  }

  async run(imageId: string): Promise<Agent> {
    logger.info("Running agent from image", { imageId });

    if (!this.agentFactory) {
      throw new Error("AgentFactory not configured. Cannot run agent from image.");
    }

    // Get image record from repository
    const record = await this.repository.findImageById(imageId);
    if (!record) {
      throw new Error(`Image not found: ${imageId}`);
    }

    // Create agent with stored definition and config
    const definition = record.definition as unknown as AgentDefinition;
    const config = record.config;

    const agent = this.agentFactory(definition, config);

    // TODO: Load messages from record.messages into agent context
    logger.debug("Agent started from image", {
      imageId,
      definitionName: definition.name,
      messageCount: record.messages.length,
    });

    return agent;
  }
}
