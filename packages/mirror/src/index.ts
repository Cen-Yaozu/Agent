/**
 * @agentxjs/mirror - Browser-side Runtime mirror
 *
 * Provides:
 * - MirrorRuntime: Browser-side Runtime mirror (containers, agents, images)
 * - PeerEnvironment: Network-based Environment (Receptor + Effector)
 *
 * This is a private package, bundled into agentxjs.
 * Users should use `createMirror` from agentxjs instead.
 *
 * @internal
 * @packageDocumentation
 */

// Runtime
export {
  MirrorRuntime,
  createMirrorRuntime,
  type MirrorRuntimeConfig,
} from "./runtime";
export { MirrorContainer, type AgentRunConfig } from "./runtime";
export { MirrorAgent } from "./runtime";
export { MirrorImage } from "./runtime";
export { SystemBusImpl } from "./runtime";

// Environment
export {
  PeerEnvironment,
  PeerReceptor,
  PeerEffector,
  createPeerEnvironment,
  type PeerEnvironmentConfig,
} from "./environment";
