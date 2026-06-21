"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import type { ConnectorOption } from "./connect-card";

interface ChatWindowProps {
  projectId: string;
  accountId: string;
  threadId: string;
  initialMessages: UIMessage[];
  connectors: ConnectorOption[];
  returnTo: string;
}

export function ChatWindow({
  projectId,
  accountId,
  threadId,
  initialMessages,
  connectors,
  returnTo,
}: ChatWindowProps) {
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat/web",
      body: { projectId, threadId, accountId },
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isStreaming]);

  const lastIndex = messages.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Send a message to get started
            </p>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming && index === lastIndex}
                  connectors={connectors}
                  returnTo={returnTo}
                />
              ))}
              {status === "submitted" ? (
                <p className="text-sm text-muted-foreground">Thinking…</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="border-t p-4">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            isStreaming={isStreaming}
            onStop={stop}
            onSend={(text) => sendMessage({ text })}
          />
        </div>
      </div>
    </div>
  );
}
