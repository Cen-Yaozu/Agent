import { useState, useEffect } from "react";
import type { AgentService } from "@deepractice-ai/agentx-framework/browser";
import type { Message } from "@deepractice-ai/agentx-framework/browser";
import type {
  ErrorMessageEvent,
  TextDeltaEvent,
  UserMessageEvent,
  AssistantMessageEvent,
  ToolUseMessageEvent,
  ConversationStartStateEvent,
  ConversationEndStateEvent,
  ErrorMessage as ErrorMessageType,
} from "@deepractice-ai/agentx-framework/browser";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ErrorMessage } from "./ErrorMessage";

export interface ChatProps {
  /**
   * Agent instance from agentx-framework
   */
  agent: AgentService;

  /**
   * Initial messages to display
   */
  initialMessages?: Message[];

  /**
   * Callback when message is sent
   */
  onMessageSend?: (message: string) => void;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Chat - Complete chat interface with real Agent integration
 *
 * Features:
 * - Real-time streaming from Claude API
 * - Message history
 * - Auto-scroll
 * - Loading states
 * - Image attachment support
 * - Full event handling using new Framework API
 *
 * @example
 * ```tsx
 * import { WebSocketBrowserAgent } from '@deepractice-ai/agentx-framework/browser';
 *
 * const agent = WebSocketBrowserAgent.create({
 *   url: 'ws://localhost:5200/ws',
 *   sessionId: 'my-session',
 * });
 *
 * await agent.initialize();
 * <Chat agent={agent} />
 * ```
 */
export function Chat({ agent, initialMessages = [], onMessageSend, className = "" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);

  useEffect(() => {
    console.log("[Chat] Setting up event listeners using agent.react()");

    // Use agent.react() - the new Framework API
    const unsubscribe = agent.react({
      // Stream layer - handle text deltas for real-time streaming
      onTextDelta(event: TextDeltaEvent) {
        console.log("[Chat] text_delta:", event.data.text);
        setStreaming((prev) => prev + event.data.text);
      },

      // Message layer - handle complete messages
      onUserMessage(event: UserMessageEvent) {
        console.log("[Chat] user_message:", event.uuid);
        // User messages are already added when handleSend is called
        // But we update here to ensure consistency with server state
        const userMsg = event.data;
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === userMsg.id)) {
            return prev;
          }
          return [...prev, userMsg];
        });
      },

      onAssistantMessage(event: AssistantMessageEvent) {
        console.log("[Chat] assistant_message:", event.uuid);
        const assistantMsg = event.data;

        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === assistantMsg.id)) {
            return prev;
          }
          return [...prev, assistantMsg];
        });

        // Clear streaming when complete message arrives
        setStreaming("");
        setIsLoading(false);
      },

      onToolUseMessage(event: ToolUseMessageEvent) {
        console.log("[Chat] tool_use_message:", event.uuid);
        const toolMsg = event.data;

        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === toolMsg.id)) {
            return prev;
          }
          return [...prev, toolMsg];
        });
      },

      // Message layer - handle error messages
      onErrorMessage(event: ErrorMessageEvent) {
        console.error("[Chat] error_message:", event);
        setErrors((prev) => [...prev, event.data]);
        setIsLoading(false);
      },

      // State layer - conversation lifecycle
      onConversationStart(_event: ConversationStartStateEvent) {
        console.log("[Chat] conversation_start");
        setIsLoading(true);
      },

      onConversationEnd(_event: ConversationEndStateEvent) {
        console.log("[Chat] conversation_end");
        setIsLoading(false);
      },
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [agent]);

  const handleSend = async (text: string) => {
    setIsLoading(true);
    onMessageSend?.(text);

    // Add user message immediately to UI
    const userMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send to agent
    await agent.send(text);
  };

  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* Messages area */}
      <ChatMessageList messages={messages} streamingText={streaming} isLoading={isLoading} />

      {/* Error messages (above input) */}
      {errors.length > 0 && (
        <div className="px-2 sm:px-4 md:px-4 pb-2 max-w-4xl mx-auto w-full space-y-2">
          {errors.map((error) => (
            <ErrorMessage key={error.id} error={error} showDetails={true} />
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-2 sm:p-4 md:p-4 flex-shrink-0 pb-2 sm:pb-4 md:pb-6">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
