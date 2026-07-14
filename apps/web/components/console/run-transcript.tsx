"use client";

import { Fragment } from "react";
import { Streamdown } from "streamdown";
import { ToolGroup, type ToolInfo } from "@/components/chat/tool-group";

export interface RunTranscriptMessage {
  id: string;
  role: string;
  parts: unknown[];
}

interface TextPart {
  type: "text";
  text: string;
}

function isTextPart(part: unknown): part is TextPart {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as { type?: unknown }).type === "text" &&
    typeof (part as { text?: unknown }).text === "string"
  );
}

function isToolPart(part: unknown): part is Record<string, unknown> {
  return (
    typeof part === "object" &&
    part !== null &&
    typeof (part as { type?: unknown }).type === "string" &&
    ((part as { type: string }).type.startsWith("tool-") ||
      (part as { type: string }).type === "dynamic-tool")
  );
}

function toolInfoOf(part: Record<string, unknown>): ToolInfo {
  const type = String(part.type);
  const name =
    type === "dynamic-tool"
      ? String(part.toolName ?? "tool")
      : type.slice("tool-".length);
  return {
    name,
    input: part.input,
    output: part.output,
    state: typeof part.state === "string" ? part.state : "output-available",
    errorText:
      typeof part.errorText === "string" ? part.errorText : undefined,
  };
}

/**
 * 저장된 run 트랜스크립트(agent_run_messages)를 렌더한다 — 텍스트 prose +
 * 연속 툴콜을 ToolGroup으로 묶는 chat-message.tsx 관례를 따른다.
 */
export function RunTranscript({
  messages,
}: {
  messages: RunTranscriptMessage[];
}) {
  if (messages.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="run-transcript-empty"
      >
        이 런의 트랜스크립트가 없습니다. 트랜스크립트 저장 이전의 런이거나,
        시작 직후 실패한 런입니다.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="run-transcript">
      {messages.map((message) => {
        const nodes: React.ReactNode[] = [];
        let toolRun: ToolInfo[] = [];
        const flushTools = (key: string) => {
          if (toolRun.length === 0) return;
          nodes.push(<ToolGroup key={key} tools={toolRun} />);
          toolRun = [];
        };
        message.parts.forEach((part, index) => {
          if (isToolPart(part)) {
            toolRun.push(toolInfoOf(part as Record<string, unknown>));
            return;
          }
          flushTools(`${message.id}-tools-${index}`);
          if (isTextPart(part) && part.text.trim()) {
            nodes.push(
              <div
                key={`${message.id}-text-${index}`}
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
              >
                <Streamdown>{part.text}</Streamdown>
              </div>,
            );
          }
        });
        flushTools(`${message.id}-tools-end`);
        return <Fragment key={message.id}>{nodes}</Fragment>;
      })}
    </div>
  );
}
