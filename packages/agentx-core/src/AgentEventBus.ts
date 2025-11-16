/**
 * AgentEventBus
 *
 * Core event bus for Agent-Provider communication.
 * Replaces repeated SDK process spawning with a persistent event stream.
 *
 * Architecture:
 * - Outbound: UserMessageEvent (Agent → Provider)
 * - Inbound: AssistantMessageEvent | StreamDeltaEvent | ResultEvent | SystemInitEvent (Provider → Agent)
 *
 * Performance:
 * - First message: ~6-7s (process startup)
 * - Subsequent messages: ~1-2s (3-5x faster)
 *
 * Design:
 * - Uses ReplaySubject for outbound to buffer user messages
 * - Prevents message loss when provider subscribes after emit
 * - Uses regular Subject for inbound (no replay needed)
 */

import { Subject, ReplaySubject, type Observable } from "rxjs";
import { filter } from "rxjs/operators";
import type { AgentEvent, UserMessageEvent } from "@deepractice-ai/agentx-api";

export class AgentEventBus {
  private events$ = new Subject<AgentEvent>();
  private outbound$ = new ReplaySubject<UserMessageEvent>(10); // Buffer last 10 user messages
  private closed = false;

  /**
   * Emit an event to the bus
   *
   * Note: Silently ignores events if bus is closed (graceful degradation)
   */
  emit(event: AgentEvent): void {
    if (this.closed) {
      console.warn("[AgentEventBus] Cannot emit event: bus is closed", event.type);
      return;
    }

    // Emit to general stream
    this.events$.next(event);

    // Also emit to outbound buffer if it's a user message
    if (event.type === "user") {
      this.outbound$.next(event);
    }
  }

  /**
   * Subscribe to outbound events (user messages)
   * Provider consumes these to send to AI
   *
   * Uses ReplaySubject to buffer messages, preventing loss
   * when provider subscribes after message emission.
   *
   * @returns Observable of UserMessageEvent
   */
  outbound(): Observable<UserMessageEvent> {
    return this.outbound$.asObservable();
  }

  /**
   * Subscribe to inbound events (AI responses)
   * Agent/UI consume these to display results
   *
   * @returns Observable of all events except UserMessageEvent
   */
  inbound(): Observable<Exclude<AgentEvent, UserMessageEvent>> {
    return this.events$.pipe(
      filter(
        (event): event is Exclude<AgentEvent, UserMessageEvent> => event.type !== "user"
      )
    );
  }

  /**
   * Subscribe to all events (debugging, logging)
   *
   * @returns Observable of all AgentEvent
   */
  all(): Observable<AgentEvent> {
    return this.events$.asObservable();
  }

  /**
   * Close the event bus
   * Completes all subscriptions
   */
  close(): void {
    if (!this.closed) {
      this.closed = true;
      this.events$.complete();
      this.outbound$.complete();
    }
  }

  /**
   * Check if the bus is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}
