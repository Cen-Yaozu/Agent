/**
 * BusDriver - AgentDriver that communicates via SystemBus
 *
 * Flow:
 * ```
 * Agent.receive(message)
 *   → BusDriver.receive(message)
 *     → bus.emit({ type: "user_message", data: message })
 *       → Effector → Claude SDK → Receptor
 *         → bus.emit(DriveableEvent)
 *           → BusDriver yields to Agent
 * ```
 */

import type { AgentDriver, UserMessage, StreamEvent } from "@agentxjs/types/agent";
import type { SystemBusConsumer, SystemBusProducer, BusEventHandler } from "@agentxjs/types/runtime/internal";
import type { SystemEvent } from "@agentxjs/types/runtime";
import type { DriveableEvent } from "@agentxjs/types/runtime";
import { createLogger } from "@agentxjs/common";
import { AsyncQueue } from "./AsyncQueue";

const logger = createLogger("runtime/BusDriver");

/** Default timeout in milliseconds (30 seconds) */
const DEFAULT_TIMEOUT = 30_000;

/**
 * BusDriver configuration
 */
export interface BusDriverConfig {
  agentId: string;
  generateTurnId?: () => string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * BusDriver - Communicates with Environment via SystemBus
 *
 * Uses separate Consumer (for receiving events) and Producer (for sending events).
 * This separation:
 * 1. Clarifies data flow direction
 * 2. Prevents accidental event loops
 * 3. Enables proper race condition handling via AsyncQueue
 */
export class BusDriver implements AgentDriver {
  readonly name = "BusDriver";
  readonly description = "Driver that communicates via SystemBus";

  private readonly consumer: SystemBusConsumer;
  private readonly producer: SystemBusProducer;
  private readonly config: BusDriverConfig;
  private aborted = false;

  constructor(
    consumer: SystemBusConsumer,
    producer: SystemBusProducer,
    config: BusDriverConfig
  ) {
    this.consumer = consumer;
    this.producer = producer;
    this.config = config;
  }

  async *receive(message: UserMessage): AsyncIterable<StreamEvent> {
    logger.info("🔵 BusDriver.receive START", { messageId: message.id, agentId: this.config.agentId });
    this.aborted = false;

    // Use AsyncQueue to properly handle producer-consumer race condition
    // This solves the issue where events might arrive before the consumer is ready
    const queue = new AsyncQueue<DriveableEvent>();
    let timedOut = false;

    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => {
      logger.warn("Request timeout", { timeout, agentId: this.config.agentId });
      timedOut = true;
      queue.close();
    }, timeout);

    // Subscribe to events BEFORE emitting user message
    const unsubscribe = this.consumer.onAny(((event: SystemEvent) => {
      if (!this.isDriveableEvent(event)) return;

      logger.info("🟢 BusDriver received driveable event", { type: event.type });

      // Clear timeout on first event received
      clearTimeout(timeoutId);

      if (this.aborted) {
        queue.close();
        return;
      }

      // Push to queue - AsyncQueue handles the race condition properly
      queue.push(event);

      if (event.type === "message_stop" || event.type === "interrupted") {
        queue.close();
      }
    }) as BusEventHandler);

    try {
      // Emit user message to bus (using producer)
      this.producer.emit({
        type: "user_message",
        data: message,
      } as never);

      // Consume from queue - no race condition because AsyncQueue handles it
      for await (const event of queue) {
        const streamEvent = this.toStreamEvent(event);
        logger.info("🟡 BusDriver yielding StreamEvent", { type: streamEvent.type });
        yield streamEvent;

        if (event.type === "message_stop" || event.type === "interrupted") {
          logger.info("🔴 BusDriver DONE (message_stop/interrupted)");
          break;
        }
      }

      logger.info("🔴 BusDriver.receive END");

      if (timedOut) {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
    } finally {
      clearTimeout(timeoutId);
      unsubscribe();
    }
  }

  interrupt(): void {
    this.aborted = true;
    this.producer.emit({
      type: "interrupt",
      agentId: this.config.agentId,
    } as never);
  }

  // Note: generateTurnId reserved for future turnId tracking implementation
  // private generateTurnId(): string {
  //   const timestamp = Date.now().toString(36);
  //   const random = Math.random().toString(36).substring(2, 8);
  //   return `turn_${timestamp}_${random}`;
  // }

  /**
   * Check if event is a DriveableEvent from Environment
   *
   * IMPORTANT: Must check source === "environment" to avoid event loops!
   * BusPresenter emits events with source === "agent" which should NOT
   * be processed by BusDriver (they are outputs, not inputs).
   */
  private isDriveableEvent(event: unknown): event is DriveableEvent {
    const driveableTypes = [
      "message_start",
      "message_delta",
      "message_stop",
      "text_content_block_start",
      "text_delta",
      "text_content_block_stop",
      "tool_use_content_block_start",
      "input_json_delta",
      "tool_use_content_block_stop",
      "tool_call",
      "tool_result",
      "interrupted",
    ];

    if (
      event === null ||
      typeof event !== "object" ||
      !("type" in event) ||
      typeof (event as { type: unknown }).type !== "string"
    ) {
      return false;
    }

    const e = event as { type: string; source?: string };

    // CRITICAL: Only process events from environment, not from agent!
    // This prevents event loops where BusPresenter's output gets fed back as input.
    if (e.source !== "environment") {
      return false;
    }

    return driveableTypes.includes(e.type);
  }

  /**
   * Convert DriveableEvent (from environment) to StreamEvent (for agent)
   *
   * DriveableEvent has: source, category, intent, timestamp, data
   * StreamEvent has: type, timestamp, data
   */
  private toStreamEvent(event: DriveableEvent): StreamEvent {
    const { type, timestamp, data } = event;

    // Map DriveableEvent data structure to StreamEvent data structure
    switch (type) {
      case "message_start": {
        const d = data as { message?: { id: string; model: string } };
        return {
          type: "message_start",
          timestamp,
          data: {
            messageId: d.message?.id ?? "",
            model: d.message?.model ?? "",
          },
        };
      }
      case "message_stop": {
        const d = data as { stopReason?: string };
        return {
          type: "message_stop",
          timestamp,
          data: {
            stopReason: d.stopReason,
          },
        } as StreamEvent;
      }
      case "text_delta": {
        const d = data as { text: string };
        return {
          type: "text_delta",
          timestamp,
          data: { text: d.text },
        };
      }
      case "tool_use_content_block_start": {
        const d = data as { id?: string; name?: string; toolCallId?: string; toolName?: string };
        return {
          type: "tool_use_start",
          timestamp,
          data: {
            toolCallId: d.toolCallId ?? d.id ?? "",
            toolName: d.toolName ?? d.name ?? "",
          },
        };
      }
      case "input_json_delta": {
        const d = data as { partialJson: string };
        return {
          type: "input_json_delta",
          timestamp,
          data: { partialJson: d.partialJson },
        };
      }
      case "tool_use_content_block_stop": {
        const d = data as { id?: string; name?: string; toolCallId?: string; toolName?: string; input?: Record<string, unknown> };
        return {
          type: "tool_use_stop",
          timestamp,
          data: {
            toolCallId: d.toolCallId ?? d.id ?? "",
            toolName: d.toolName ?? d.name ?? "",
            input: d.input ?? {},
          },
        };
      }
      case "tool_result": {
        const d = data as { toolUseId?: string; toolCallId?: string; result: unknown; isError?: boolean };
        return {
          type: "tool_result",
          timestamp,
          data: {
            toolCallId: d.toolCallId ?? d.toolUseId ?? "",
            result: d.result,
            isError: d.isError,
          },
        };
      }
      default:
        // For other events, pass through with minimal transformation
        return { type, timestamp, data } as StreamEvent;
    }
  }
}
