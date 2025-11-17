/**
 * User-facing Reactor interfaces
 *
 * 4-layer event handling interfaces for AgentX.
 * All methods are optional - users only implement what they need.
 */

export type { StreamReactor } from "./StreamReactor";
export type { StateReactor } from "./StateReactor";
export type { MessageReactor } from "./MessageReactor";
export type { ExchangeReactor } from "./ExchangeReactor";

export {
  StreamReactorAdapter,
  StateReactorAdapter,
  MessageReactorAdapter,
  ExchangeReactorAdapter,
  wrapUserReactor,
  type UserReactor,
} from "./ReactorAdapter";
