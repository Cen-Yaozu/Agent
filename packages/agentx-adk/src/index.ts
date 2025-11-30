/**
 * AgentX ADK (Agent Development Kit)
 *
 * Development-time tools for building type-safe AgentX drivers and agents.
 * Separates development concerns from runtime concerns.
 *
 * ## Design Principles
 *
 * 1. **Three-Layer Pattern**: defineConfig → defineDriver → defineAgent
 * 2. **Type Flow**: Config schema flows through to runtime type checking
 * 3. **Scope Separation**: container/definition/instance config scopes
 * 4. **Development vs Runtime**: ADK is for building, agentx is for running
 *
 * ## Module Structure
 *
 * | Module           | Purpose                                         |
 * |------------------|-------------------------------------------------|
 * | defineConfig.ts  | Create reusable config schemas with validation  |
 * | defineDriver.ts  | Create Driver class with attached schema        |
 * | defineAgent.ts   | Create Agent definition (template)              |
 *
 * ## Key Design Decisions
 *
 * ### 1. Why Three-Layer Pattern?
 *
 * **Problem**: How to ensure type safety from schema definition to runtime use?
 *
 * **Decision**: Three composable layers:
 * ```
 * defineConfig(schema) → ConfigDefinition
 *       ↓
 * defineDriver({ config }) → DriverClass with schema attached
 *       ↓
 * defineAgent({ driver }) → AgentDefinition with inferred types
 * ```
 *
 * **Benefits**:
 * - Config schema is the single source of truth
 * - TypeScript infers types at each layer
 * - No runtime schema mismatch possible
 *
 * ### 2. Why Config Scopes (container/definition/instance)?
 *
 * **Problem**: Different config values come from different sources:
 * - Some from runtime environment (agentId, createdAt)
 * - Some from agent developer (model, systemPrompt)
 * - Some from app developer (apiKey, endpoint)
 *
 * **Decision**: Three scopes with clear ownership:
 * - `container`: Injected by runtime (agentId, createdAt)
 * - `definition`: Set by agent developer in defineAgent()
 * - `instance`: Set by app developer in agentx.agents.create()
 *
 * **Benefits**:
 * - Clear responsibility for each config value
 * - Prevents accidental overrides
 * - Supports default + override patterns
 *
 * ### 3. Why Attach Schema to DriverClass?
 *
 * **Problem**: How does defineAgent know what config the driver expects?
 *
 * **Decision**: defineDriver attaches schema as static property:
 * ```typescript
 * const MyDriver = defineDriver({ config: myConfig, ... });
 * MyDriver.schema; // The schema is available!
 * ```
 *
 * **Benefits**:
 * - TypeScript can infer config types from driver
 * - No need to pass schema separately
 * - Schema available for documentation generation
 *
 * ### 4. Why Separate ADK from Runtime (agentx)?
 *
 * **Problem**: Development tools and runtime have different concerns.
 *
 * **Decision**: Split into two packages:
 * - `agentx-adk`: Development-time (defineConfig, defineDriver, defineAgent)
 * - `agentx`: Runtime (createAgentX, agentx.agents.create)
 *
 * **Benefits**:
 * - Clear separation of concerns
 * - ADK can be dev-only dependency
 * - Runtime package stays lean
 *
 * @example
 * ```typescript
 * import { defineConfig, defineDriver, defineAgent } from "@deepractice-ai/agentx-adk";
 *
 * // 1. Define config schema
 * const myConfig = defineConfig({
 *   apiKey: { type: "string", scopes: ["instance"], required: true },
 *   model: { type: "string", scopes: ["definition", "instance"], default: "gpt-4" },
 * });
 *
 * // 2. Define driver with schema
 * const MyDriver = defineDriver({
 *   name: "MyDriver",
 *   config: myConfig,
 *   create: (context) => ({ ... }),
 * });
 *
 * // 3. Define agent (types inferred from MyDriver.schema)
 * const MyAgent = defineAgent({
 *   name: "MyAgent",
 *   driver: MyDriver,
 *   config: { model: "gpt-4-turbo" }, // Type-safe!
 * });
 * ```
 *
 * @module @deepractice-ai/agentx-adk
 */

// Re-export types from agentx-types
export type {
  ConfigDefinition,
  DefineDriverInput,
  DefineAgentInput,
} from "@deepractice-ai/agentx-types";

// defineConfig
export { defineConfig } from "./defineConfig";

// defineDriver
export { defineDriver } from "./defineDriver";

// defineAgent
export { defineAgent } from "./defineAgent";
