/**
 * WebSocketDriver - Client-side WebSocket driver
 *
 * Implements AgentDriver interface by:
 * 1. Sending UserMessage to WebSocket server
 * 2. Receiving Stream events from server
 * 3. Yielding them as AsyncIterable
 */

import type { AgentDriver } from "@deepractice-ai/agentx-core";
import type { UserMessage } from "@deepractice-ai/agentx-types";
import type { StreamEventType } from "@deepractice-ai/agentx-event";

export interface WebSocketDriverConfig {
  /**
   * WebSocket URL to connect to
   * @example "ws://localhost:5200/ws"
   */
  url: string;

  /**
   * Session ID for this agent instance
   */
  sessionId: string;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  connectionTimeout?: number;
}

/**
 * WebSocket Driver for browser clients
 *
 * Sends messages to WebSocket server and streams back events.
 */
export class WebSocketDriver implements AgentDriver {
  readonly sessionId: string;
  readonly driverSessionId: string;

  private ws: WebSocket | null = null;
  private config: Required<WebSocketDriverConfig>;
  private isDestroyed = false;
  private eventListeners: Array<(event: any) => void> = [];

  constructor(config: WebSocketDriverConfig) {
    this.sessionId = config.sessionId;
    this.driverSessionId = `ws-${config.sessionId}`;

    this.config = {
      url: config.url,
      sessionId: config.sessionId,
      connectionTimeout: config.connectionTimeout ?? 5000,
    };
  }

  /**
   * Send user message and stream back events from server
   */
  async *sendMessage(message: UserMessage | AsyncIterable<UserMessage>): AsyncIterable<StreamEventType> {
    // Handle single message
    const messages = Symbol.asyncIterator in Object(message)
      ? (message as AsyncIterable<UserMessage>)
      : [message] as UserMessage[];

    // Ensure WebSocket is connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    // Send each message
    for await (const msg of messages) {
      yield* this.sendSingleMessage(msg);
    }
  }

  /**
   * Send a single message and stream back events
   */
  private async *sendSingleMessage(message: UserMessage): AsyncIterable<StreamEventType> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    // Create event stream
    const events: StreamEventType[] = [];
    let isDone = false;
    let error: Error | null = null;

    const handleEvent = (event: any) => {
      if (event.type === "message_stop") {
        isDone = true;
      }
      events.push(event);
    };

    this.eventListeners.push(handleEvent);

    try {
      // Send message to server
      this.ws.send(JSON.stringify({
        type: "user_message",
        data: message,
      }));

      // Yield events as they arrive
      while (!isDone && !error) {
        // Wait for next event
        await new Promise((resolve) => setTimeout(resolve, 10));

        while (events.length > 0) {
          const event = events.shift()!;
          yield event;

          if (event.type === "message_stop") {
            isDone = true;
            break;
          }
        }
      }

      if (error) {
        throw error;
      }
    } finally {
      // Remove listener
      const index = this.eventListeners.indexOf(handleEvent);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    }
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("WebSocketDriver has been destroyed");
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        const timeout = setTimeout(() => {
          reject(new Error("WebSocket connection timeout"));
          this.ws?.close();
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          console.log(`[WebSocketDriver] Connected to ${this.config.url}`);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Notify all listeners
            for (const listener of this.eventListeners) {
              listener(data);
            }
          } catch (error) {
            console.error("[WebSocketDriver] Failed to parse message:", error);
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error("[WebSocketDriver] WebSocket error:", error);
          reject(new Error("WebSocket connection error"));
        };

        this.ws.onclose = () => {
          console.log("[WebSocketDriver] Disconnected");
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Abort current operation
   */
  abort(): void {
    // Clear event listeners to stop yielding events
    this.eventListeners = [];
    console.log("[WebSocketDriver] Aborted");
  }

  /**
   * Destroy driver and close connection
   */
  async destroy(): Promise<void> {
    this.isDestroyed = true;
    this.eventListeners = [];

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log("[WebSocketDriver] Destroyed");
  }
}
