/**
 * Effector - Acts upon the environment based on ecosystem events.
 *
 * From systems theory:
 * - An effector is a component that produces an effect on the environment
 * - It transforms internal signals into external actions
 *
 * This is a pure abstraction. Concrete effectors (SSEEffector, WebSocketEffector)
 * are defined in runtime/.
 *
 * Effectors are the output boundary of the ecosystem.
 */
export interface Effector<E = unknown> {
  /**
   * Send an event to the external environment.
   *
   * @param event - The ecosystem event to transmit
   */
  send(event: E): void;

  /**
   * Clean up resources.
   */
  dispose(): void;
}
