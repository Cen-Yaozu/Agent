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
import type { SystemBus } from "@agentxjs/types/runtime/internal";
import type { DriveableEvent } from "@agentxjs/types/runtime";
import { createLogger } from "@agentxjs/common";

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
 */
export class BusDriver implements AgentDriver {
  readonly name = "BusDriver";
  readonly description = "Driver that communicates via SystemBus";

  private readonly bus: SystemBus;
  private readonly config: BusDriverConfig;
  private aborted = false;

  constructor(bus: SystemBus, config: BusDriverConfig) {
    this.bus = bus;
    this.config = config;
  }

  async *receive(message: UserMessage): AsyncIterable<StreamEvent> {
    this.aborted = false;

    const events: DriveableEvent[] = [];
    let resolveNext: ((value: IteratorResult<DriveableEvent>) => void) | null = null;
    let done = false;
    let timedOut = false;

    const timeout = this.config.timeout ?? DEFAULT_TIMEOUT;
    const timeoutId = setTimeout(() => {
      logger.warn("Request timeout", { timeout, agentId: this.config.agentId });
      timedOut = true;
      done = true;
      if (resolveNext) {
        resolveNext({ done: true, value: undefined as never });
      }
    }, timeout);

    const unsubscribe = this.bus.onAny((event) => {
      if (!this.isDriveableEvent(event)) return;

      // Clear timeout on first event received
      clearTimeout(timeoutId);

      if (this.aborted) {
        done = true;
        if (resolveNext) {
          resolveNext({ done: true, value: undefined as never });
        }
        return;
      }

      if (event.type === "message_stop" || event.type === "interrupted") {
        events.push(event);
        done = true;
      } else {
        events.push(event);
      }

      if (resolveNext) {
        const e = events.shift();
        if (e) {
          resolveNext({ done: false, value: e });
          resolveNext = null;
        } else if (done) {
          resolveNext({ done: true, value: undefined as never });
          resolveNext = null;
        }
      }
    });

    try {
      // Emit user message to bus
      this.bus.emit({
        type: "user_message",
        data: message,
      } as never);

      while (!done || events.length > 0) {
        if (events.length > 0) {
          const event = events.shift()!;
          // Convert DriveableEvent to StreamEvent format
          yield this.toStreamEvent(event);
          if (event.type === "message_stop" || event.type === "interrupted") {
            break;
          }
        } else if (!done) {
          await new Promise<IteratorResult<DriveableEvent>>((resolve) => {
            resolveNext = resolve;
          });
        }
      }

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
    this.bus.emit({
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
    return (
      event !== null &&
      typeof event === "object" &&
      "type" in event &&
      typeof (event as { type: unknown }).type === "string" &&
      driveableTypes.includes((event as { type: string }).type)
    );
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
