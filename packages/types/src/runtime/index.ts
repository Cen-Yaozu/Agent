/**
 * Runtime Module - Execution environment for AI Agents
 *
 * Public API for runtime layer.
 *
 * For internal implementation types (Container, LLM, Sandbox, Session, etc.),
 * use `@agentxjs/types/runtime/internal`.
 *
 * @packageDocumentation
 */

// ============================================================================
// Runtime Entry
// ============================================================================

export type { Runtime, RuntimeEventHandler } from "./Runtime";

// ============================================================================
// Agent Runtime
// ============================================================================

export type { Agent } from "./Agent";
export type { AgentConfig } from "./AgentConfig";
export type { AgentLifecycle } from "./AgentLifecycle";

// ============================================================================
// Events (Public)
// ============================================================================

export type {
  SystemEvent,
  EventSource,
  EventIntent,
  EventCategory,
} from "./event/base/SystemEvent";
