/**
 * AgentX Logger
 *
 * SLF4J-style logging facade with lazy initialization.
 * Provides consistent logging API across all AgentX packages.
 *
 * ## Design Principles
 *
 * 1. **Facade Pattern**: Abstract logging interface, pluggable implementations
 * 2. **Lazy Initialization**: Safe at module level, configured later
 * 3. **Hierarchical Naming**: Logger names reflect module structure
 * 4. **Zero Runtime Cost**: Disabled levels have minimal overhead
 *
 * ## Module Structure
 *
 * | Module             | Purpose                                      |
 * |--------------------|----------------------------------------------|
 * | LoggerFactory.ts   | Central factory with lazy proxy pattern      |
 * | ConsoleLogger.ts   | Default console implementation               |
 *
 * ## Key Design Decisions
 *
 * ### 1. Why Lazy Initialization?
 *
 * **Problem**: Logger is created at module load time, but configuration
 * happens later in app entry point. How to configure already-created loggers?
 *
 * **Decision**: createLogger() returns a lazy proxy that defers to real
 * logger on first use.
 *
 * **Flow**:
 * ```typescript
 * // At module load (before config)
 * const logger = createLogger("engine/AgentEngine"); // Returns lazy proxy
 *
 * // At app entry point
 * LoggerFactory.configure({ defaultLevel: LogLevel.DEBUG });
 *
 * // At runtime (first use)
 * logger.debug("..."); // Now creates real logger with config
 * ```
 *
 * **Benefits**:
 * - Safe to call createLogger() at module level
 * - Configuration can happen anytime before first use
 * - No global initialization order issues
 *
 * ### 2. Why Hierarchical Logger Names?
 *
 * **Problem**: How to identify log sources across packages?
 *
 * **Decision**: Use "/" separated names: "package/module/class"
 *
 * **Examples**:
 * - `"engine/AgentEngine"`
 * - `"core/agent/AgentInstance"`
 * - `"platform/server/SSEConnection"`
 *
 * **Benefits**:
 * - Easy to filter by package/module
 * - Mirrors file structure
 * - Enables per-module log level configuration (future)
 *
 * ### 3. Why Pluggable Implementation?
 *
 * **Problem**: Different environments need different logging:
 * - Development: Console with colors
 * - Production: Structured JSON for log aggregation
 * - Browser: Browser console API
 *
 * **Decision**: LoggerFactory accepts custom implementation factory.
 *
 * **Usage**:
 * ```typescript
 * LoggerFactory.configure({
 *   defaultImplementation: (name) => new PinoLogger(name),
 * });
 * ```
 *
 * **Benefits**:
 * - Zero coupling to specific logging library
 * - Same logging code works everywhere
 * - Easy to swap implementations
 *
 * ### 4. Why Level Check Methods?
 *
 * **Problem**: Constructing log messages has cost, even if not logged.
 *
 * **Decision**: Provide isXxxEnabled() methods:
 * ```typescript
 * if (logger.isDebugEnabled()) {
 *   logger.debug("Expensive", expensiveComputation());
 * }
 * ```
 *
 * **Benefits**:
 * - Skip expensive computation when level disabled
 * - Common pattern from SLF4J/Log4J
 *
 * @example
 * ```typescript
 * import { createLogger } from "@deepractice-ai/agentx-logger";
 *
 * const logger = createLogger("MyModule");
 * logger.info("Hello");
 * logger.debug("Debug info", { context: "data" });
 * ```
 *
 * @packageDocumentation
 */

// Re-export types from agentx-types
export { LogLevel } from "@deepractice-ai/agentx-types";
export type {
  Logger,
  LogContext,
  LoggerFactory as LoggerFactoryInterface,
} from "@deepractice-ai/agentx-types";

// Core exports
export { ConsoleLogger, type ConsoleLoggerOptions } from "./ConsoleLogger";
export {
  LoggerFactory,
  type LoggerFactoryConfig,
  setLoggerFactory,
  createLogger,
} from "./LoggerFactory";
