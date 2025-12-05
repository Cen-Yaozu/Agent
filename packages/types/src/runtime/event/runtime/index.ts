/**
 * Runtime Events - Container internal events
 *
 * Note: Agent events are defined in @agentxjs/types/agent package.
 * Runtime transforms AgentOutput to SystemEvent via Presenter.
 */

// Base
export type { RuntimeEvent, RuntimeContext } from "./RuntimeEvent";
export {
  isRuntimeEvent,
  isRequestEvent,
  isResultEvent,
  isNotificationEvent,
} from "./RuntimeEvent";

// Session Events
export * from "./session";

// Container Events (includes Sandbox)
export * from "./container";
