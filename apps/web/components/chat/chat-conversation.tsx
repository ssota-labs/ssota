"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import type { ConnectorOption } from "./connect-card";
import { DEFAULT_MODEL_ID } from "@/lib/chat/models";

interface ChatConversationProps {
  projectId: string;
  accountId: string;
  threadId: string;
  initialMessages: UIMessage[];
  connectors: ConnectorOption[];
  returnTo: string;
  orgSlug: string;
  projectSlug: string;
}

export function ChatConversation({
  projectId,
  accountId,
  threadId,
  initialMessages,
  connectors,
  returnTo,
  orgSlug,
  projectSlug,
}: ChatConversationProps) {
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);

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

  function send(text: string, files: FileUIPart[]) {
    sendMessage(
      files.length > 0 ? { text, files } : { text },
      { body: { modelId: model } },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              메시지를 보내 대화를 시작하세요
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
                <p className="text-sm text-muted-foreground">생각 중…</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            isStreaming={isStreaming}
            onStop={stop}
            onSend={send}
            projectId={projectId}
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            model={model}
            onModelChange={setModel}
          />
        </div>
      </div>
    </div>
  );
}
