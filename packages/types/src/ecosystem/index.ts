/**
 * Ecosystem - Pure abstractions from systems theory perspective.
 *
 * This module provides the foundational concepts for the Agent Ecosystem:
 * - Ecosystem: Event bus for observable system state
 * - Receptor: Input boundary (senses signals, produces events)
 * - Effector: Output boundary (transmits events to external world)
 *
 * Concrete implementations and event types are defined in runtime/.
 */

export type { Ecosystem, EcosystemEventHandler } from "./Ecosystem";
// Note: Unsubscribe is already exported from agent/AgentEventHandler
export type { Receptor } from "./Receptor";
export type { Effector } from "./Effector";
export type { EcosystemEvent } from "./EcosystemEvent";
