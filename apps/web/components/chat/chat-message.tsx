"use client";

import type { ReactNode } from "react";
import { CopyIcon } from "@phosphor-icons/react";
import {
  getToolName,
  isToolUIPart,
  type FileUIPart,
  type UIMessage,
} from "ai";
import { Streamdown } from "streamdown";
import { ToolGroup, type ToolInfo } from "./tool-group";
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
 * markdown via Streamdown inside a ghost Bubble, collapse consecutive tool calls
 * into a ToolGroup accordion, and surface connection requests as inline cards.
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

  return (
    <Message>
      <MessageContent>
        <div
          className="group w-full min-w-0 space-y-3 overflow-hidden"
          data-testid="assistant-message"
        >
          {renderAssistantParts(message.parts, {
            isStreaming,
            connectors,
            returnTo,
          })}
        </div>
      </MessageContent>
    </Message>
  );
}

interface RenderOptions {
  isStreaming: boolean;
  connectors: ConnectorOption[];
  returnTo: string;
}

/**
 * 어시스턴트 파트를 순서대로 그린다. 연속된 tool 호출은 하나의 ToolGroup 으로
 * 접고, 텍스트·connect 카드를 만나면 진행 중이던 tool 런을 flush 한다.
 * request_connection 은 인라인 ConnectCard 로 승격한다.
 */
function renderAssistantParts(
  parts: UIMessage["parts"],
  { isStreaming, connectors, returnTo }: RenderOptions,
): ReactNode[] {
  const textParts = parts.filter(
    (p): p is { type: "text"; text: string } =>
      p.type === "text" && typeof (p as { text?: unknown }).text === "string",
  );
  const lastTextIndex = textParts.length > 0 ? textParts.length - 1 : -1;
  let textPartIndex = -1;

  const nodes: ReactNode[] = [];
  let run: ToolInfo[] = [];
  let groupSeq = 0;

  const flush = () => {
    if (run.length > 0) {
      nodes.push(<ToolGroup key={`tools-${groupSeq++}`} tools={run} />);
      run = [];
    }
  };

  parts.forEach((part, index) => {
    if (part.type === "text") {
      textPartIndex += 1;
      const isLastText = textPartIndex === lastTextIndex;
      flush();
      nodes.push(
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
        </div>,
      );
      return;
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
        flush();
        nodes.push(
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
          />,
        );
      }
      return;
    }

    if (isToolUIPart(part)) {
      run.push({
        name: getToolName(part),
        input: "input" in part ? part.input : undefined,
        output: "output" in part ? part.output : undefined,
        state: part.state,
        errorText: "errorText" in part ? part.errorText : undefined,
      });
    }
  });

  flush();
  return nodes;
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
