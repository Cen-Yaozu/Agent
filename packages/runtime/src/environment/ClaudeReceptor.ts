/**
 * ClaudeReceptor - Perceives Claude SDK responses and emits to SystemBus
 *
 * Converts Claude SDK stream events to DriveableEvents.
 * DriveableEvents are the subset of EnvironmentEvents that can drive Agent.
 *
 * Type Relationship:
 * ```
 * EnvironmentEvent
 * ├── DriveableEvent ← ClaudeReceptor outputs this
 * │   └── message_start, text_delta, message_stop, interrupted...
 * └── ConnectionEvent
 * ```
 */

import type { Receptor, SystemBusProducer } from "@agentxjs/types/runtime/internal";
import type {
  DriveableEvent,
  MessageStartEvent,
  TextDeltaEvent,
  MessageStopEvent,
  InterruptedEvent,
  EventContext,
} from "@agentxjs/types/runtime";
import type { SDKPartialAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { createLogger } from "@agentxjs/common";

/**
 * Metadata passed with each SDK message for event correlation
 */
export interface ReceptorMeta {
  requestId: string;
  context: EventContext;
}

const logger = createLogger("ecosystem/ClaudeReceptor");

/**
 * ClaudeReceptor - Perceives Claude SDK and emits DriveableEvents to SystemBus
 *
 * Uses SystemBusProducer (write-only) because Receptor only emits events.
 */
export class ClaudeReceptor implements Receptor {
  private producer: SystemBusProducer | null = null;
  private currentMeta: ReceptorMeta | null = null;

  /**
   * Connect to SystemBus producer to emit events
   */
  connect(producer: SystemBusProducer): void {
    this.producer = producer;
    logger.debug("ClaudeReceptor connected to SystemBusProducer");
  }

  /**
   * Feed SDK message to receptor with correlation metadata
   * @param sdkMsg - SDK message from Claude
   * @param meta - Request metadata for event correlation
   */
  feed(sdkMsg: SDKPartialAssistantMessage, meta: ReceptorMeta): void {
    this.currentMeta = meta;
    this.processStreamEvent(sdkMsg);
  }

  /**
   * Emit interrupted event
   */
  emitInterrupted(reason: "user_interrupt" | "timeout" | "error" | "system", meta?: ReceptorMeta): void {
    const eventMeta = meta || this.currentMeta;
    this.emitToBus({
      type: "interrupted",
      timestamp: Date.now(),
      source: "environment",
      category: "stream",
      intent: "notification",
      broadcastable: false,
      requestId: eventMeta?.requestId,
      context: eventMeta?.context,
      data: { reason },
    } as InterruptedEvent);
  }

  /**
   * Process stream_event from SDK and emit corresponding DriveableEvent
   *
   * Uses currentMeta for requestId and context correlation.
   */
  private processStreamEvent(sdkMsg: SDKPartialAssistantMessage): void {
    const event = sdkMsg.event;
    const { requestId, context } = this.currentMeta || {};

    // All DriveableEvents are internal-only (broadcastable: false)
    // They are consumed by BusDriver and processed through MealyMachine
    // BusPresenter will emit the transformed SystemEvents to clients

    switch (event.type) {
      case "message_start":
        this.emitToBus({
          type: "message_start",
          timestamp: Date.now(),
          source: "environment",
          category: "stream",
          intent: "notification",
          broadcastable: false,
          requestId,
          context,
          data: {
            message: {
              id: event.message.id,
              model: event.message.model,
            },
          },
        } as MessageStartEvent);
        break;

      case "content_block_delta":
        if (event.delta.type === "text_delta") {
          this.emitToBus({
            type: "text_delta",
            timestamp: Date.now(),
            source: "environment",
            category: "stream",
            intent: "notification",
            broadcastable: false,
            requestId,
            context,
            data: { text: event.delta.text },
          } as TextDeltaEvent);
        }
        break;

      case "message_stop":
        this.emitToBus({
          type: "message_stop",
          timestamp: Date.now(),
          source: "environment",
          category: "stream",
          intent: "notification",
          broadcastable: false,
          requestId,
          context,
          data: { stopReason: "end_turn" },
        } as MessageStopEvent);
        break;
    }
  }

  private emitToBus(event: DriveableEvent): void {
    if (this.producer) {
      this.producer.emit(event);
    }
  }
}
