"use client";

import { CopyIcon } from "@phosphor-icons/react";
import {
  getToolName,
  isToolUIPart,
  type FileUIPart,
  type UIMessage,
} from "ai";
import { Streamdown } from "streamdown";
import { AgentTraceMarker } from "./agent-trace-marker";
import { Bubble, BubbleContent } from "@ssota/ui/components/ui/bubble";
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTrigger,
} from "@ssota/ui/components/ui/attachment";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@ssota/ui/components/ui/message";
import { ConnectCard, type ConnectorOption } from "./connect-card";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  connectors: ConnectorOption[];
  returnTo: string;
}

/**
 * One conversation turn. User turns use Message + Bubble; assistant turns render
 * markdown via Streamdown inside a ghost Bubble and surface tools as trace rows
 * or inline connect cards.
 */
export function ChatMessage({
  message,
  isStreaming,
  connectors,
  returnTo,
}: ChatMessageProps) {
  if (message.role === "user") {
    const text = textOf(message);
    const images = message.parts.filter(
      (p): p is FileUIPart =>
        p.type === "file" && p.mediaType.startsWith("image/"),
    );
    return (
      <Message align="end">
        <MessageContent>
          {images.length > 0 ? (
            <AttachmentGroup className="justify-end">
              {images.map((img, i) => (
                <Attachment
                  key={`${img.url}-${i}`}
                  orientation="vertical"
                  state="done"
                  className="w-32"
                >
                  <AttachmentMedia variant="image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.filename ?? "첨부 이미지"}
                      data-testid="user-message-image"
                    />
                  </AttachmentMedia>
                  {img.url ? (
                    <AttachmentTrigger
                      render={
                        <a
                          href={img.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={img.filename ?? "첨부 이미지 열기"}
                        />
                      }
                    />
                  ) : null}
                </Attachment>
              ))}
            </AttachmentGroup>
          ) : null}
          {text ? (
            <Bubble variant="secondary" align="end">
              <BubbleContent className="whitespace-pre-wrap">
                {text}
              </BubbleContent>
            </Bubble>
          ) : null}
        </MessageContent>
      </Message>
    );
  }

  const textParts = message.parts.filter(
    (p): p is { type: "text"; text: string } =>
      p.type === "text" && typeof (p as { text?: unknown }).text === "string",
  );
  const lastTextIndex = textParts.length > 0 ? textParts.length - 1 : -1;
  let textPartIndex = -1;

  return (
    <Message>
      <MessageContent>
        <div
          className="group w-full min-w-0 space-y-3 overflow-hidden"
          data-testid="assistant-message"
        >
          {message.parts.map((part, index) => {
            if (part.type === "text") {
              textPartIndex += 1;
              const isLastText = textPartIndex === lastTextIndex;
              return (
                <div key={index} className="space-y-2">
                  <Bubble variant="ghost">
                    <BubbleContent>
                      <Streamdown
                        className="prose prose-sm dark:prose-invert max-w-none"
                        mode={isStreaming ? "streaming" : "static"}
                      >
                        {part.text}
                      </Streamdown>
                    </BubbleContent>
                  </Bubble>
                  {isLastText && part.text.trim().length > 0 ? (
                    <MessageFooter className="opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Copy"
                        title="Copy"
                        onClick={() => {
                          void navigator.clipboard.writeText(part.text);
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </MessageFooter>
                  ) : null}
                </div>
              );
            }

            if (isToolUIPart(part) && getToolName(part) === "request_connection") {
              const output = (part as { output?: unknown }).output as
                | {
                    connector?: string;
                    reason?: string;
                    teamspaceId?: string;
                    accountId?: string | null;
                  }
                | undefined;
              if (output?.connector && output.teamspaceId) {
                return (
                  <ConnectCard
                    key={index}
                    request={{
                      connector: output.connector,
                      reason: output.reason,
                      teamspaceId: output.teamspaceId,
                      accountId: output.accountId ?? null,
                    }}
                    connectors={connectors}
                    returnTo={returnTo}
                  />
                );
              }
            }

            if (isToolUIPart(part)) {
              const toolName = getToolName(part);
              if (toolName === "request_connection") return null;
              const toolPart = part as {
                state: string;
              };
              return (
                <AgentTraceMarker
                  key={index}
                  toolName={toolName}
                  state={
                    toolPart.state as Parameters<
                      typeof AgentTraceMarker
                    >[0]["state"]
                  }
                />
              );
            }

            return null;
          })}
        </div>
      </MessageContent>
    </Message>
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
