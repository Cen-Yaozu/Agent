import { useState, useEffect } from "react";
import type { Agent } from "@deepractice-ai/agentx-browser";
import type { Message } from "@deepractice-ai/agentx-types";
import type { ErrorEvent } from "@deepractice-ai/agentx-api";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { ErrorMessage } from "./ErrorMessage";

export interface ChatProps {
  /**
   * Agent instance from agentx-browser
   */
  agent: Agent;

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
 * - Full event handling (user, assistant, stream_event, result)
 *
 * @example
 * ```tsx
 * import { createAgent } from '@deepractice-ai/agentx-browser';
 *
 * const agent = createAgent({
 *   wsUrl: 'ws://localhost:5200/ws',
 *   sessionId: 'my-session',
 * });
 *
 * <Chat agent={agent} />
 * ```
 */
export function Chat({ agent, initialMessages = [], onMessageSend, className = "" }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ErrorEvent[]>([]);

  useEffect(() => {
    console.log("[Chat] Setting up event listeners");

    // Listen for assistant messages (complete)
    const unsubAssistant = agent.on("assistant", (event) => {
      console.log("[Chat] assistant event received:", event.uuid, event.message.content);
      setMessages((prev) => {
        console.log("[Chat] Adding assistant message, current count:", prev.length);
        return [
          ...prev,
          {
            id: event.uuid,
            role: "assistant",
            content: event.message.content as string,
            timestamp: event.timestamp,
          },
        ];
      });
      setStreaming("");
      setIsLoading(false);
    });

    // Listen for streaming chunks
    const unsubStream = agent.on("stream_event", (event) => {
      const delta = event.delta;
      if (delta?.type === "text_delta" && 'text' in delta) {
        console.log("[Chat] stream_event delta:", delta.text);
        setStreaming((prev) => prev + delta.text);
      }
    });

    // Listen for user messages
    const unsubUser = agent.on("user", (event) => {
      console.log("[Chat] user event received:", event.uuid);
      setMessages((prev) => [
        ...prev,
        {
          id: event.uuid,
          role: "user",
          content: event.message.content as string,
          timestamp: event.timestamp,
        },
      ]);
    });

    // Listen for error events
    const unsubError = agent.on("error", (event) => {
      console.error("[Chat] error event received:", event);
      setErrors((prev) => [...prev, event]);
      setIsLoading(false); // Stop loading on error
    });

    // Cleanup on unmount - only unsubscribe, don't destroy agent
    // Agent lifecycle is managed by parent component
    return () => {
      unsubAssistant();
      unsubStream();
      unsubUser();
      unsubError();
    };
  }, [agent]);

  const handleSend = async (text: string) => {
    setIsLoading(true);
    onMessageSend?.(text);
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
            <ErrorMessage key={error.uuid} error={error} showDetails={true} />
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
