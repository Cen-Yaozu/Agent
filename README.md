<div align="center">
  <h1>AgentX · AI Agent Runtime</h1>
  <p>
    <strong>Deploy AI Agents in seconds, or build your own with our framework</strong>
  </p>

  <hr/>

  <p>
    <a href="https://github.com/Deepractice/AgentX"><img src="https://img.shields.io/github/stars/Deepractice/AgentX?style=social" alt="Stars"/></a>
    <a href="LICENSE"><img src="https://img.shields.io/github/license/Deepractice/AgentX?color=blue" alt="License"/></a>
    <a href="https://www.npmjs.com/package/agentxjs"><img src="https://img.shields.io/npm/v/agentxjs?color=cb3837&logo=npm" alt="npm"/></a>
    <a href="https://hub.docker.com/r/deepracticexs/portagent"><img src="https://img.shields.io/docker/pulls/deepracticexs/portagent?logo=docker" alt="Docker"/></a>
  </p>

  <p>
    <a href="README.md"><strong>English</strong></a> |
    <a href="README.zh-CN.md">简体中文</a>
  </p>
</div>

---

## 🚀 Quick Start

Run your AI Agent gateway in one command:

```bash
docker run -d \
  --name portagent \
  -p 5200:5200 \
  -e LLM_PROVIDER_KEY=sk-ant-xxxxx \
  -e LLM_PROVIDER_URL=https://api.anthropic.com \
  -v ./data:/home/agentx/.agentx \
  deepracticexs/portagent:latest
```

Open <http://localhost:5200> and start chatting!

![Portagent Demo](./apps/portagent/public/Portagent.gif)

### What You Get

- **Multi-User Support** - User registration (invite code optional)
- **Session Persistence** - Resume conversations anytime
- **Real-time Streaming** - WebSocket-based communication
- **Docker Ready** - Production-ready with health checks

> **Tip:** Add `-e INVITE_CODE_REQUIRED=true` to enable invite code protection.

👉 **[Full Portagent Documentation](./apps/portagent/README.md)** - Configuration, deployment, API reference

---

## 🛠️ Build with AgentX

AgentX is a TypeScript framework for building AI Agent applications with Docker-style lifecycle management.

```typescript
import { createAgentX } from "agentxjs";

// Create AgentX instance
const agentx = await createAgentX({
  llm: {
    apiKey: process.env.LLM_PROVIDER_KEY,
    baseUrl: process.env.LLM_PROVIDER_URL,
  },
});

// Create session and start chatting
const session = await agentx.sessions.create("default-image", "user-1");
const agent = await session.resume();

// Subscribe to events
agent.react({
  onTextDelta: (e) => process.stdout.write(e.data.text),
  onAssistantMessage: (e) => console.log("\n[Done]"),
});

await agent.receive("Hello!");
```

### Key Features

| Feature                    | Description                                                 |
| -------------------------- | ----------------------------------------------------------- |
| **Docker-style Lifecycle** | Define → Image → Session, commit & resume conversations     |
| **4-Layer Events**         | Stream, State, Message, Turn - each for different consumers |
| **Isomorphic**             | Same API for Server (Node.js) and Browser                   |
| **Type-safe**              | 140+ TypeScript definition files                            |

---

## 📦 Packages

```bash
npm install agentxjs @agentxjs/runtime
```

| Package             | Description                             |
| ------------------- | --------------------------------------- |
| `agentxjs`          | Core framework and platform API         |
| `@agentxjs/runtime` | Node.js runtime (Claude driver, SQLite) |
| `@agentxjs/ui`      | React UI components                     |
| `@agentxjs/types`   | TypeScript definitions                  |

---

## 📚 Documentation

<table>
  <tr>
    <td><strong>Getting Started</strong></td>
    <td><a href="./docs/getting-started/installation.md">Installation</a> · <a href="./docs/getting-started/quickstart.md">Quickstart</a> · <a href="./docs/getting-started/first-agent.md">First Agent</a></td>
  </tr>
  <tr>
    <td><strong>Core Concepts</strong></td>
    <td><a href="./docs/concepts/lifecycle.md">Lifecycle</a> · <a href="./docs/concepts/event-system.md">Event System</a> · <a href="./docs/concepts/mealy-machine.md">Mealy Machine</a></td>
  </tr>
  <tr>
    <td><strong>Deployment</strong></td>
    <td><a href="./apps/portagent/README.md">Portagent</a> · <a href="./apps/portagent/docker-compose.yml">Docker Compose</a></td>
  </tr>
</table>

---

## 🗺️ Roadmap

- [x] Docker-style lifecycle (Definition → Image → Session)
- [x] 4-layer event system
- [x] Server/Browser isomorphic architecture
- [x] Claude driver (via Claude Agent SDK)
- [ ] OpenAI driver
- [ ] Local LLM support (Ollama)
- [ ] Multi-agent orchestration
- [ ] Plugin system

---

## 🤝 Contributing

```bash
git clone https://github.com/Deepractice/AgentX.git
cd AgentX
pnpm install
pnpm dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT - see [LICENSE](./LICENSE)

---

<div align="center">
  <p>
    Built with ❤️ by <a href="https://github.com/Deepractice">Deepractice</a>
  </p>
</div>
