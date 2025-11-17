/**
 * WebSocketBrowserAgent
 *
 * Pre-configured Agent for browser environments.
 * Connects to AgentX WebSocket server and streams events.
 *
 * @example
 * ```typescript
 * import { WebSocketBrowserAgent } from "@deepractice-ai/agentx-framework/agents";
 *
 * const agent = WebSocketBrowserAgent.create({
 *   url: "ws://localhost:5200/ws",
 *   sessionId: `session-${Date.now()}`,
 * });
 *
 * await agent.initialize();
 * await agent.send("Hello!");
 * ```
 */

import { defineAgent } from "../defineAgent";
import { WebSocketDriver } from "../drivers/WebSocketDriver";
import { defineConfig } from "../defineConfig";

/**
 * WebSocketBrowserAgent - Pre-configured browser WebSocket client
 *
 * This agent:
 * 1. Connects to WebSocket server (ws://localhost:5200/ws)
 * 2. Sends user messages to server
 * 3. Receives streaming events from server
 * 4. Processes events through the 4-layer pipeline
 */
export const WebSocketBrowserAgent = defineAgent({
  name: "WebSocketBrowser",
  driver: WebSocketDriver,
  config: defineConfig({
    url: { type: "string", required: true },
    sessionId: { type: "string", required: true },
    connectionTimeout: { type: "number", default: 5000 },
  }),
});
