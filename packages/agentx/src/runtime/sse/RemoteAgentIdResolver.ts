/**
 * RemoteAgentIdResolver - Resolves agent ID from remote server
 *
 * Calls server API to create agent and returns server's agent ID.
 * This ensures browser and server use the same agentId.
 */

import type { AgentIdResolver } from "@agentxjs/types";
import { createHttpClient, type KyInstance } from "~/managers/remote/HttpClient";
import { createLogger } from "@agentxjs/common";

const logger = createLogger("agentx/RemoteAgentIdResolver");

export interface RemoteAgentIdResolverOptions {
  serverUrl: string;
  headers?: Record<string, string>;
}

interface RunImageResponse {
  agentId: string;
}

interface ResumeSessionResponse {
  agentId: string;
}

/**
 * Remote implementation of AgentIdResolver
 *
 * Calls server API to create agent before local agent is created.
 */
export class RemoteAgentIdResolver implements AgentIdResolver {
  private readonly client: KyInstance;

  constructor(options: RemoteAgentIdResolverOptions) {
    this.client = createHttpClient({
      baseUrl: options.serverUrl,
      headers: options.headers,
    });
  }

  async resolveForRun(imageId: string, containerId: string): Promise<string> {
    logger.debug("Resolving agent ID for run", { imageId, containerId });

    const response = await this.client
      .post(`images/${imageId}/run`, {
        json: { containerId },
      })
      .json<RunImageResponse>();

    logger.info("Agent ID resolved for run", { imageId, agentId: response.agentId });
    return response.agentId;
  }

  async resolveForResume(sessionId: string, containerId: string): Promise<string> {
    logger.debug("Resolving agent ID for resume", { sessionId, containerId });

    const response = await this.client
      .post(`sessions/${sessionId}/resume`, {
        json: { containerId },
      })
      .json<ResumeSessionResponse>();

    logger.info("Agent ID resolved for resume", { sessionId, agentId: response.agentId });
    return response.agentId;
  }
}
