"use client";

import { SpinnerGapIcon, WrenchIcon } from "@phosphor-icons/react";

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

const VISIBLE_TOOLS = new Set(["connection_search", "connection_call"]);

function isVisibleToolName(toolName: string): boolean {
  return VISIBLE_TOOLS.has(toolName);
}

function labelForTool(toolName: string): string {
  if (toolName === "connection_search") return "연결 검색";
  if (toolName === "connection_call") return "연결 호출";
  return toolName;
}

function summarizeOutput(toolName: string, output: unknown): string | null {
  if (toolName === "connection_search" && output && typeof output === "object") {
    const payload = output as {
      matched?: Array<{ qualifiedName?: string }>;
      tools?: Array<{ qualifiedName?: string }>;
      errors?: Array<{ connection?: string; message?: string }>;
    };
    const matched = payload.matched ?? payload.tools;
    const count = matched?.length ?? 0;
    if (count > 0) return `${count}개 도구 발견`;
    const err = payload.errors?.[0];
    if (err?.message) {
      return err.connection
        ? `${err.connection}: ${err.message}`
        : err.message;
    }
    return "연결된 도구 없음";
  }
  if (toolName === "connection_call" && output && typeof output === "object") {
    const record = output as { ok?: boolean; error?: string; stub?: boolean };
    if (record.ok === false && record.error) {
      return record.error;
    }
    if (record.stub) {
      return "stub MCP 호출 완료";
    }
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
        <SpinnerGapIcon className="mt-0.5 size-3.5 shrink-0 animate-spin" />
      ) : (
        <WrenchIcon className="mt-0.5 size-3.5 shrink-0" />
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
