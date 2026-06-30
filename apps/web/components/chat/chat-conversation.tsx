"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { FileUIPart, UIMessage } from "ai";
import { WorkflowChatTransport } from "@ai-sdk/workflow";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@ssota/ui/components/ui/message-scroller";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { ChatThinkingMarker } from "./chat-thinking-marker";
import type { ConnectorOption } from "./connect-card";
import { DEFAULT_MODEL_ID } from "@/lib/chat/models";

interface ChatConversationProps {
  teamspaceId: string;
  accountId: string;
  threadId: string;
  initialMessages: UIMessage[];
  connectors: ConnectorOption[];
  returnTo: string;
  orgSlug: string;
  teamspaceSlug: string;
}

export function ChatConversation({
  teamspaceId,
  accountId,
  threadId,
  initialMessages,
  connectors,
  returnTo,
  orgSlug,
  teamspaceSlug,
}: ChatConversationProps) {
  const [model, setModel] = useState<string>(DEFAULT_MODEL_ID);

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new WorkflowChatTransport<UIMessage>({
      api: "/api/chat/web",
      prepareSendMessagesRequest: ({ body, messages: msgs }) => ({
        body: { ...body, teamspaceId, threadId, accountId, messages: msgs },
      }),
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const lastIndex = messages.length - 1;

  function send(text: string, files: FileUIPart[]) {
    sendMessage(
      files.length > 0 ? { text, files } : { text },
      { body: { modelId: model } },
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll scrollPreviousItemPeek={64}>
        <MessageScroller className="flex-1 min-h-0">
          {messages.length === 0 ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-16">
              <p className="text-center text-sm text-muted-foreground">
                메시지를 보내 대화를 시작하세요
              </p>
            </div>
          ) : (
            <MessageScrollerViewport>
              <MessageScrollerContent
                aria-busy={isStreaming}
                className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8"
              >
                {messages.map((message, index) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                  >
                    <ChatMessage
                      message={message}
                      isStreaming={isStreaming && index === lastIndex}
                      connectors={connectors}
                      returnTo={returnTo}
                    />
                  </MessageScrollerItem>
                ))}
                {status === "submitted" ? (
                  <MessageScrollerItem messageId="__thinking__">
                    <ChatThinkingMarker />
                  </MessageScrollerItem>
                ) : null}
              </MessageScrollerContent>
            </MessageScrollerViewport>
          )}
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <div className="p-4">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            isStreaming={isStreaming}
            onStop={stop}
            onSend={send}
            teamspaceId={teamspaceId}
            orgSlug={orgSlug}
            teamspaceSlug={teamspaceSlug}
            model={model}
            onModelChange={setModel}
          />
        </div>
      </div>
    </div>
  );
}
