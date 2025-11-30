/**
 * AgentX UI
 *
 * React component library for building AI agent interfaces.
 * Provides chat components, hooks for agent binding, and design system.
 *
 * ## Design Principles
 *
 * 1. **Headless + Styled**: Core logic in hooks, styling via Tailwind
 * 2. **Atomic Design**: Elements → Chat → Layout composition
 * 3. **Agent-First**: Components designed for AI streaming UX
 * 4. **Design Tokens**: Semantic colors for AI concepts
 *
 * ## Module Structure
 *
 * | Module             | Purpose                                      |
 * |--------------------|----------------------------------------------|
 * | hooks/             | React hooks (useAgent, useAgentX)            |
 * | components/agent/  | Agent status indicator                       |
 * | components/chat/   | Chat UI (messages, input, streaming)         |
 * | components/elements/| Atomic UI (Button, Input, Card, etc.)       |
 * | components/layout/ | Page layout (Header, Sidebar, etc.)          |
 * | styles/            | Tailwind CSS and design tokens               |
 *
 * ## Key Design Decisions
 *
 * ### 1. Why useAgent Hook for Event Binding?
 *
 * **Problem**: React needs to re-render when agent events arrive.
 * How to connect Agent's event-driven API to React's state model?
 *
 * **Decision**: useAgent hook subscribes to agent events and updates React state.
 *
 * **Flow**:
 * ```
 * Agent → events → useAgent → React state → UI render
 * ```
 *
 * **Benefits**:
 * - Declarative: Just pass agent to hook
 * - Automatic cleanup on unmount
 * - Streaming text accumulation built-in
 * - Error state management included
 *
 * ### 2. Why Separate Streaming Text from Messages?
 *
 * **Problem**: Streaming text needs special handling:
 * - Renders incrementally (character by character)
 * - Not yet a complete message
 * - Should not be in message array
 *
 * **Decision**: `streaming` is separate state from `messages`.
 *
 * **Usage**:
 * ```tsx
 * const { messages, streaming } = useAgent(agent);
 * return (
 *   <>
 *     {messages.map(m => <Message {...m} />)}
 *     {streaming && <StreamingText text={streaming} />}
 *   </>
 * );
 * ```
 *
 * **Benefits**:
 * - Clear separation of complete vs in-progress
 * - Easy to style streaming differently
 * - No message flickering during stream
 *
 * ### 3. Why Design Tokens for AI Concepts?
 *
 * **Problem**: AI interfaces have unique concepts:
 * - "Thinking" state vs "Responding" state
 * - User vs Assistant messages
 * - Tool execution feedback
 *
 * **Decision**: Semantic color tokens for AI concepts:
 * - `primary`: Computational intelligence (Blue)
 * - `secondary`: Generative creativity (Amber)
 * - `accent`: Interactive highlights (Orange)
 *
 * **Benefits**:
 * - Consistent visual language
 * - Easy to theme
 * - Meaningful color associations
 *
 * ### 4. Why Storybook for Development?
 *
 * **Problem**: UI components need isolated development environment.
 *
 * **Decision**: Use Storybook for component development.
 *
 * **Benefits**:
 * - Visual component documentation
 * - Isolated testing of edge cases
 * - Design system reference
 * - Enables UI-first development
 *
 * @example
 * ```tsx
 * import { useAgent, ChatInput, MessageList } from "@deepractice-ai/agentx-ui";
 * import "@deepractice-ai/agentx-ui/styles.css";
 *
 * function ChatPage({ agent }) {
 *   const { messages, streaming, send, isLoading } = useAgent(agent);
 *
 *   return (
 *     <div>
 *       <MessageList messages={messages} streaming={streaming} />
 *       <ChatInput onSend={send} disabled={isLoading} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// Import global styles (will be extracted during build)
import "./styles/globals.css";

// Re-export components from api layer
export * from "./api";

// Re-export types
export * from "./types";
