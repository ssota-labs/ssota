"use client";

import { Loader2, Wrench } from "lucide-react";

type ToolActivityState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "output-denied";

interface ToolActivityProps {
  toolName: string;
  state: ToolActivityState;
  output?: unknown;
  errorText?: string;
}

const VISIBLE_TOOLS = new Set(["connection_search"]);

function isVisibleToolName(toolName: string): boolean {
  return VISIBLE_TOOLS.has(toolName) || toolName.includes("__");
}

function labelForTool(toolName: string): string {
  if (toolName === "connection_search") return "연결 검색";
  if (toolName.includes("__")) {
    const [connection, tool] = toolName.split("__");
    return `${connection} · ${tool}`;
  }
  return toolName;
}

function summarizeOutput(toolName: string, output: unknown): string | null {
  if (toolName === "connection_search" && output && typeof output === "object") {
    const tools = (output as { tools?: Array<{ qualifiedName?: string }> }).tools;
    const count = tools?.length ?? 0;
    return count > 0 ? `${count}개 도구 발견` : "연결된 도구 없음";
  }
  if (output && typeof output === "object" && "ok" in output) {
    const record = output as { ok?: boolean; error?: string };
    if (record.ok === false && record.error) {
      return record.error;
    }
  }
  return null;
}

export function shouldShowToolActivity(toolName: string): boolean {
  return isVisibleToolName(toolName);
}

export function ToolActivity({
  toolName,
  state,
  output,
  errorText,
}: ToolActivityProps) {
  const label = labelForTool(toolName);
  const isRunning =
    state === "input-streaming" || state === "input-available";
  const summary =
    state === "output-available" ? summarizeOutput(toolName, output) : null;
  const error = state === "output-error" ? errorText : null;

  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
      data-testid={`tool-activity-${toolName}`}
    >
      {isRunning ? (
        <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
      ) : (
        <Wrench className="mt-0.5 size-3.5 shrink-0" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-foreground/80">
          {isRunning ? `${label} 실행 중…` : label}
        </p>
        {summary ? <p className="break-words">{summary}</p> : null}
        {error ? (
          <p className="break-words text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
