"use client";

import { SpinnerGapIcon, WrenchIcon } from "@phosphor-icons/react";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  summarizeConnectionSearchOutput,
  type ConnectionSearchSummaryTranslator,
} from "@/lib/chat/connection-search-summary";

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

export function shouldShowToolActivity(toolName: string): boolean {
  return isVisibleToolName(toolName);
}

export function ToolActivity({
  toolName,
  state,
  output,
  errorText,
}: ToolActivityProps) {
  const { t } = useLocale();

  const label =
    toolName === "connection_search"
      ? t("chat.toolActivity.connectionSearch")
      : toolName === "connection_call"
        ? t("chat.toolActivity.connectionCall")
        : toolName;

  const isRunning =
    state === "input-streaming" || state === "input-available";

  const summary =
    state === "output-available"
      ? summarizeToolOutput(toolName, output, t)
      : null;
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
          {isRunning
            ? t("chat.toolActivity.running", { label })
            : label}
        </p>
        {summary ? <p className="break-words">{summary}</p> : null}
        {error ? (
          <p className="break-words text-destructive">{error}</p>
        ) : null}
      </div>
    </div>
  );
}

function summarizeToolOutput(
  toolName: string,
  output: unknown,
  t: ConnectionSearchSummaryTranslator,
): string | null {
  if (toolName === "connection_search") {
    return summarizeConnectionSearchOutput(output, t);
  }
  if (toolName === "connection_call" && output && typeof output === "object") {
    const record = output as { ok?: boolean; error?: string; stub?: boolean };
    if (record.ok === false && record.error) {
      return record.error;
    }
    if (record.stub) {
      return t("chat.toolActivity.stubCallComplete");
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
