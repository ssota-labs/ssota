"use client";

import { CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { Marker, MarkerContent, MarkerIcon } from "@ssota/ui/components/ui/marker";
import { Spinner } from "@ssota/ui/components/ui/spinner";
import { cn } from "@ssota/ui/lib/utils";
import { useLocale } from "@/components/i18n/locale-provider";
import { getToolTraceLabelKey } from "@/lib/chat/tool-trace-labels";

type ToolTraceState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "output-denied";

interface AgentTraceMarkerProps {
  toolName: string;
  state: ToolTraceState;
}

function isRunning(state: ToolTraceState): boolean {
  return state === "input-streaming" || state === "input-available";
}

function resolveLabel(
  toolName: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const labelKey = getToolTraceLabelKey(toolName);
  if (labelKey) {
    return t(`chat.toolTrace.labels.${labelKey}`);
  }
  return t("chat.toolTrace.fallback", { toolName });
}

export function AgentTraceMarker({ toolName, state }: AgentTraceMarkerProps) {
  const { t } = useLocale();
  const running = isRunning(state);
  const failed = state === "output-error" || state === "output-denied";
  const label = resolveLabel(toolName, t);

  return (
    <Marker
      variant="border"
      role={running ? "status" : undefined}
      data-testid={`tool-trace-${toolName}`}
    >
      <MarkerIcon>
        {running ? (
          <Spinner />
        ) : failed ? (
          <WarningIcon className="text-destructive" />
        ) : (
          <CheckIcon className="text-muted-foreground" />
        )}
      </MarkerIcon>
      <MarkerContent
        className={cn(failed && "text-destructive", running && "shimmer")}
      >
        {running ? `${label}…` : label}
      </MarkerContent>
    </Marker>
  );
}
