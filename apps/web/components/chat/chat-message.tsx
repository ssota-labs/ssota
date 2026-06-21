"use client";

import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { ConnectCard, type ConnectorOption } from "./connect-card";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  connectors: ConnectorOption[];
  returnTo: string;
}

/**
 * One conversation turn. User turns are a right-aligned bubble; assistant turns
 * render markdown via Streamdown and surface the `request_connection` tool as an
 * inline connect card (open-agents-style inline tool UI).
 */
export function ChatMessage({
  message,
  isStreaming,
  connectors,
  returnTo,
}: ChatMessageProps) {
  if (message.role === "user") {
    const text = textOf(message);
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-3xl bg-secondary px-4 py-2 text-sm">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div
      className="group w-full min-w-0 space-y-3 overflow-hidden"
      data-testid="assistant-message"
    >
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return (
            <Streamdown
              key={index}
              className="prose prose-sm dark:prose-invert max-w-none"
              mode={isStreaming ? "streaming" : "static"}
            >
              {part.text}
            </Streamdown>
          );
        }

        if (isToolUIPart(part) && getToolName(part) === "request_connection") {
          const output = (part as { output?: unknown }).output as
            | {
                connector?: string;
                reason?: string;
                projectId?: string;
                accountId?: string | null;
              }
            | undefined;
          if (output?.connector && output.projectId) {
            return (
              <ConnectCard
                key={index}
                request={{
                  connector: output.connector,
                  reason: output.reason,
                  projectId: output.projectId,
                  accountId: output.accountId ?? null,
                }}
                connectors={connectors}
                returnTo={returnTo}
              />
            );
          }
        }

        return null;
      })}
    </div>
  );
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter(
      (p): p is { type: "text"; text: string } =>
        p.type === "text" && typeof (p as { text?: unknown }).text === "string",
    )
    .map((p) => p.text)
    .join("");
}
