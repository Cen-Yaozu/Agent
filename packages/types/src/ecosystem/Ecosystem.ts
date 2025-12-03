/**
 * Unsubscribe function returned by event subscription.
 */
export type Unsubscribe = () => void;

/**
 * Handler function for ecosystem events.
 * Generic to allow different event types.
 */
export type EcosystemEventHandler<E = unknown> = (event: E) => void;

/**
 * Ecosystem interface - the Agent Ecosystem from systems theory perspective.
 *
 * The Ecosystem is the observable boundary where agents operate:
 * - Agents interact with their environment
 * - Receptors sense signals and produce events
 * - Effectors act upon the environment
 * - Observers subscribe to ecosystem events
 *
 * This is a pure abstraction. Concrete event types are defined in runtime/.
 */
export interface Ecosystem<E = unknown> {
  /**
   * Subscribe to all ecosystem events.
   *
   * @param handler - Callback invoked for each event
   * @returns Unsubscribe function to stop listening
   */
  on(handler: EcosystemEventHandler<E>): Unsubscribe;

  /**
   * Emit an event to the ecosystem.
   * Used internally by Receptors.
   *
   * @param event - The event to emit
   */
  emit(event: E): void;

  /**
   * Dispose the ecosystem and clean up resources.
   */
  dispose(): void;
}
