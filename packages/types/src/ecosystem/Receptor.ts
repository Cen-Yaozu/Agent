/**
 * Receptor - Senses external signals and converts them to ecosystem events.
 *
 * From systems theory:
 * - A receptor is a sensory component that detects stimuli from the environment
 * - It transforms raw signals into a format the system can process
 *
 * This is a pure abstraction. Concrete receptors (AgentReceptor, SSEReceptor)
 * are defined in runtime/.
 *
 * Receptors are the input boundary of the ecosystem.
 */
export interface Receptor<E = unknown> {
  /**
   * Start sensing and emitting events.
   * The receptor will call the provided emit function for each event detected.
   *
   * @param emit - Function to emit events to the ecosystem
   */
  start(emit: (event: E) => void): void;

  /**
   * Stop sensing and clean up resources.
   */
  stop(): void;
}
