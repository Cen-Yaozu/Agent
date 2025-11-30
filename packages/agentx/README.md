# @deepractice-ai/agentx

> Unified Platform API for the Deepractice AgentX ecosystem

## Overview

`@deepractice-ai/agentx` is the **central entry point** for the AgentX platform, providing a complete API for building and managing AI agents across different deployment scenarios.

**Key Characteristics:**

- **Dual Mode Architecture** - Local (in-process) and Remote (HTTP/SSE) modes
- **Web Standard Based** - Server built on Request/Response API, framework-agnostic
- **Stream-First Transport** - Efficient SSE transmission with client-side reassembly
- **Framework Adapters** - Ready-to-use adapters for Express, Hono, Next.js
- **Provider Registry** - Built-in dependency injection for extensibility

## Installation

```bash
pnpm add @deepractice-ai/agentx
```

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        @deepractice-ai/agentx                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      createAgentX()                          │    │
│  │                                                              │    │
│  │   options.mode === 'local'    options.mode === 'remote'     │    │
│  │            │                           │                     │    │
│  │            ▼                           ▼                     │    │
│  │   ┌──────────────┐            ┌──────────────┐              │    │
│  │   │ AgentXLocal  │            │ AgentXRemote │              │    │
│  │   │              │            │              │              │    │
│  │   │ • agents     │            │ • agents     │              │    │
│  │   │ • sessions   │            │ • sessions   │              │    │
│  │   │ • errors     │            │ • platform   │              │    │
│  │   └──────────────┘            └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │      /server         │    │           /client                 │   │
│  │                      │    │                                   │   │
│  │ createAgentXHandler  │    │  SSEDriver (browser)             │   │
│  │ SSEServerTransport   │    │  SSEClientTransport              │   │
│  │                      │    │  createRemoteAgent               │   │
│  │ /adapters:           │    │  AgentXClient                    │   │
│  │  • express           │    │                                   │   │
│  │  • hono              │    └──────────────────────────────────┘   │
│  │  • next              │                                           │
│  └──────────────────────┘                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Module Reference

### Core API (`/`)

The main entry point for creating AgentX instances.

| Export         | Type      | Description                            |
| -------------- | --------- | -------------------------------------- |
| `createAgentX` | Function  | Factory for AgentX instances           |
| `agentx`       | Singleton | Default local AgentX instance          |
| `createAgent`  | Function  | Convenience wrapper for agent creation |
| `getAgent`     | Function  | Get agent by ID from default instance  |
| `hasAgent`     | Function  | Check agent existence                  |
| `destroyAgent` | Function  | Destroy agent by ID                    |
| `destroyAll`   | Function  | Destroy all agents                     |

```typescript
import { createAgentX, agentx } from "@deepractice-ai/agentx";

// Local mode (default) - agents run in-process
const local = createAgentX();
// or use the singleton
const agent = agentx.agents.create(MyAgent, config);

// Remote mode - connect to AgentX server
const remote = createAgentX({
  mode: "remote",
  remote: { serverUrl: "http://localhost:5200/agentx" },
});
```

#### AgentXLocal Interface

```typescript
interface AgentXLocal {
  readonly mode: "local";
  readonly agents: AgentManager; // Agent lifecycle management
  readonly sessions: LocalSessionManager; // Session storage
  readonly errors: ErrorManager; // Global error handling
  provide<T>(key: ProviderKey<T>, provider: T): void; // DI registration
  resolve<T>(key: ProviderKey<T>): T | undefined; // DI resolution
}
```

#### AgentXRemote Interface

```typescript
interface AgentXRemote {
  readonly mode: "remote";
  readonly agents: AgentManager; // Agent lifecycle (local + remote)
  readonly sessions: RemoteSessionManager; // Remote session API
  readonly platform: PlatformManager; // Server info/health
  provide<T>(key: ProviderKey<T>, provider: T): void;
  resolve<T>(key: ProviderKey<T>): T | undefined;
}
```

---

### Server Module (`/server`)

HTTP handler and SSE transport for exposing agents over the network.

```typescript
import { createAgentXHandler } from "@deepractice-ai/agentx/server";
```

#### `createAgentXHandler(agentx, options?)`

Creates a framework-agnostic HTTP handler based on Web Standard Request/Response.

```typescript
const handler = createAgentXHandler(agentx, {
  basePath: "/agentx", // URL prefix
  allowDynamicCreation: false, // Enable POST /agents
  allowedDefinitions: [], // Whitelist for dynamic creation
  hooks: {
    onConnect: (agentId, connectionId) => {
      /* SSE connected */
    },
    onDisconnect: (agentId, connectionId) => {
      /* SSE disconnected */
    },
    onMessage: (agentId, message) => {
      /* Message received */
    },
    onError: (agentId, error) => {
      /* Error occurred */
    },
  },
});

// Returns: (request: Request) => Promise<Response>
```

#### HTTP API Endpoints

| Method | Path                         | Description               |
| ------ | ---------------------------- | ------------------------- |
| GET    | `/info`                      | Platform info             |
| GET    | `/health`                    | Health check              |
| GET    | `/agents`                    | List all agents           |
| POST   | `/agents`                    | Create agent (if enabled) |
| GET    | `/agents/:agentId`           | Get agent info            |
| DELETE | `/agents/:agentId`           | Destroy agent             |
| GET    | `/agents/:agentId/sse`       | SSE event stream          |
| POST   | `/agents/:agentId/messages`  | Send message to agent     |
| POST   | `/agents/:agentId/interrupt` | Interrupt processing      |

#### SSE Transport

The server only forwards **Stream Layer events** via SSE:

```text
Server AgentEngine
       │
       ├── text_delta          ─┐
       ├── tool_call            │
       ├── message_start        ├──▶ SSE Stream
       ├── message_stop         │
       └── error               ─┘
                                │
                                ▼
                         Browser Client
                                │
                        AgentEngine (client)
                                │
                        Reassembles:
                        ├── assistant_message
                        ├── tool_call_message
                        └── turn_response
```

---

### Server Adapters (`/server/adapters`)

Ready-to-use adapters for popular HTTP frameworks.

#### Express

```typescript
import { toExpressHandler } from "@deepractice-ai/agentx/server/adapters/express";
import express from "express";

const app = express();
app.use(express.json());
app.use("/agentx", toExpressHandler(handler));
```

#### Hono

```typescript
import { createHonoRoutes } from "@deepractice-ai/agentx/server/adapters/hono";
import { Hono } from "hono";

const app = new Hono();
createHonoRoutes(app, "/agentx", handler);
// or: app.all("/agentx/*", toHonoHandler(handler));
```

#### Next.js App Router

```typescript
// app/agentx/[...path]/route.ts
import { createNextHandler } from "@deepractice-ai/agentx/server/adapters/next";

const handler = createAgentXHandler(agentx);
export const { GET, POST, DELETE } = createNextHandler(handler, {
  basePath: "/agentx",
});
```

---

### Client Module (`/client`)

Browser and Node.js SDK for connecting to remote AgentX servers.

```typescript
import { createRemoteAgent, SSEDriver } from "@deepractice-ai/agentx/client";
```

#### `createRemoteAgent(options)`

High-level API for creating a remote agent connection:

```typescript
const agent = createRemoteAgent({
  serverUrl: "http://localhost:5200/agentx",
  agentId: "agent_123",
});

// Use like a local agent
agent.on("assistant_message", (event) => {
  console.log(event.data.content);
});

await agent.receive("Hello!");
await agent.destroy();
```

#### SSEDriver

ADK-based driver for browser SSE connections:

```typescript
import { defineAgent } from "@deepractice-ai/agentx-adk";
import { SSEDriver } from "@deepractice-ai/agentx/client";

const RemoteAgent = defineAgent({
  name: "RemoteAgent",
  driver: SSEDriver,
});

const agent = agentx.agents.create(RemoteAgent, {
  serverUrl: "http://localhost:5200/agentx",
  agentId: "agent_123",
});
```

#### AgentXClient

Low-level HTTP client for direct API access:

```typescript
import { AgentXClient } from "@deepractice-ai/agentx/client";

const client = new AgentXClient({
  baseUrl: "http://localhost:5200/agentx",
  headers: { Authorization: "Bearer xxx" },
});

const info = await client.getInfo();
const agents = await client.listAgents();
const agent = await client.getAgent("agent_123");
```

---

## Design Decisions

### Why Dual Mode Architecture?

AgentX supports both local and remote modes to accommodate different use cases:

| Scenario             | Mode   | Benefit                             |
| -------------------- | ------ | ----------------------------------- |
| Development          | Local  | Fast iteration, no server needed    |
| Single-process app   | Local  | Lower latency, simpler deployment   |
| Multi-client access  | Remote | Share agents across clients         |
| Browser applications | Remote | Agents run on server, UI in browser |
| Microservices        | Remote | Agents as a service                 |

```typescript
// Same API, different deployment
const agentx = createAgentX(); // Local
const agentx = createAgentX({ mode: "remote", remote: { serverUrl } }); // Remote
```

### Why Web Standard Request/Response?

The server handler is built on Web Standard APIs instead of Express/Fastify/etc:

1. **Framework Agnostic** - Works with any framework via thin adapters
2. **Edge Compatible** - Runs on Cloudflare Workers, Deno Deploy, etc.
3. **Future Proof** - Web Standards are stable and widely supported
4. **Testable** - Can test handlers without framework boilerplate

```typescript
// The handler is just a function
type AgentXHandler = (request: Request) => Promise<Response>;

// Adapters are thin wrappers
const toExpressHandler = (handler) => (req, res) => {
  const request = toWebRequest(req);
  const response = await handler(request);
  copyToExpressResponse(response, res);
};
```

### Why Stream-Only SSE Transport?

Server forwards only Stream Layer events, not Message/State/Turn events:

1. **Efficient Bandwidth** - Only transmit incremental deltas
2. **Decoupling** - Server doesn't need to know client's event needs
3. **Consistency** - Same AgentEngine code runs on server and client
4. **Flexibility** - Different clients can process events differently

```text
┌─────────────────────────────────────────────────────────────┐
│ WRONG: Server sends assembled messages                       │
│                                                              │
│ Server → [assembled message] → Client                        │
│          (large payload)       (just displays)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CORRECT: Server sends stream events                          │
│                                                              │
│ Server → [text_delta, text_delta, ...] → Client.AgentEngine │
│          (small increments)              (reassembles)       │
└─────────────────────────────────────────────────────────────┘
```

### Why Provider Registry?

Built-in dependency injection enables extensibility without coupling:

```typescript
import { LoggerFactoryKey } from "@deepractice-ai/agentx-types";

// Register custom logger
agentx.provide(LoggerFactoryKey, myLoggerFactory);

// Framework resolves internally
const logger = agentx.resolve(LoggerFactoryKey);
```

**Use Cases:**

- Custom logger implementation
- Metrics/telemetry providers
- Storage backends
- Authentication handlers

---

## Package Structure

```text
@deepractice-ai/agentx
├── /                    # Core: createAgentX, agentx singleton
├── /server              # HTTP handler, SSE transport
│   └── /adapters        # Framework adapters
│       ├── /express     # Express.js adapter
│       ├── /hono        # Hono adapter
│       └── /next        # Next.js App Router adapter
└── /client              # Browser/Node.js client SDK
```

---

## Package Dependencies

```text
agentx-types (type definitions)
     ↑
agentx-adk (defineAgent, defineDriver, defineConfig)
     ↑
agentx-logger (logging facade)
     ↑
agentx-engine (event processing)
     ↑
agentx-core (Agent runtime)
     ↑
agentx (this package) ← Platform API
     ↑
agentx-claude (Claude driver)
     ↑
agentx-ui (React components)
```

---

## Related Packages

| Package                                           | Description             |
| ------------------------------------------------- | ----------------------- |
| [@deepractice-ai/agentx-types](../agentx-types)   | Type definitions        |
| [@deepractice-ai/agentx-adk](../agentx-adk)       | Agent Development Kit   |
| [@deepractice-ai/agentx-core](../agentx-core)     | Agent runtime           |
| [@deepractice-ai/agentx-engine](../agentx-engine) | Event processing engine |
| [@deepractice-ai/agentx-claude](../agentx-claude) | Claude driver           |
| [@deepractice-ai/agentx-logger](../agentx-logger) | Logging facade          |
| [@deepractice-ai/agentx-ui](../agentx-ui)         | React components        |

---

## License

MIT
