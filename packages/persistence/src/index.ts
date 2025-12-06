/**
 * @agentxjs/persistence - Multi-backend persistence for AgentX
 *
 * Provides unified storage layer supporting multiple backends:
 * - Memory (default, for testing)
 * - FileSystem
 * - Redis
 * - SQLite
 *
 * @example
 * ```typescript
 * import { createPersistence } from "@agentxjs/persistence";
 *
 * // Memory (default)
 * const persistence = createPersistence();
 *
 * // SQLite
 * const persistence = createPersistence({
 *   driver: "sqlite",
 *   path: "./data.db",
 * });
 *
 * // Redis
 * const persistence = createPersistence({
 *   driver: "redis",
 *   url: "redis://localhost:6379",
 * });
 *
 * // Use with runtime
 * const runtime = createRuntime({ persistence });
 * ```
 *
 * @packageDocumentation
 */

export { PersistenceImpl, createPersistence } from "./PersistenceImpl";
export type { PersistenceConfig, StorageDriver } from "./PersistenceImpl";

// Re-export repository implementations for advanced usage
export {
  StorageImageRepository,
  StorageContainerRepository,
  StorageSessionRepository,
} from "./repository";
